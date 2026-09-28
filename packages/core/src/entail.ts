import { generateObject } from "ai";
import { z } from "zod";
import { type Auditor, runAudit } from "./auditor";
import { canonicalCitations } from "./citation-id";
import type { Model } from "./llm";
import { verifyQuote } from "./quote";
import type {
  Artifact,
  CitationCheck,
  Claim,
  Entailment,
  EntailmentStatus,
  Evidence,
  Narrative,
} from "./types";

const MAX_CHECKS = 6;
const JUDGE_BODY_CAP = 1_600;

const EMPTY: Entailment = { checked: false, checks: [], supported: 0, misattributed: 0 };

const UNVERIFIED_QUOTE = "the cited quote was not found in the source";

const withUnverifiedNote = (reason: string): string =>
  reason ? `${reason} (${UNVERIFIED_QUOTE})` : UNVERIFIED_QUOTE;

const claimSchema = z.object({
  status: z
    .enum(["supported", "weak", "unsupported"])
    .describe(
      "supported = the source(s) state or clearly imply the WHOLE claim, including any relationship it asserts (quote required); weak = the right sources / on-topic, but no single line proves the specific point — use this when the claim asserts a link (e.g. 'X because Y') the sources do not actually establish; unsupported = the sources are about something else and the claim could not have come from them.",
    ),
  quote: z
    .string()
    .describe(
      "For 'supported': a snippet copied VERBATIM from ONE of the sources that proves the claim (character for character, never paraphrased). Empty string otherwise.",
    ),
  reason: z
    .string()
    .describe("One short line: why the sources do or do not substantiate the claim."),
});

const CLAIM_SYSTEM = [
  "You are a citation auditor. An answer about a line of code's history makes ONE claim, drawn",
  "from the source(s) shown. Judge ONLY whether these sources substantiate THIS claim — from the",
  "source text alone, never outside knowledge, never what merely seems plausible.",
  "",
  "The claim may assert a RELATIONSHIP between facts — 'X was added because of Y', 'A fixed B',",
  "'this replaced Z'. A relationship is 'supported' only if the sources actually establish it:",
  "that Y motivated X, not merely that X and Y each happened. Two true facts do not prove a link",
  "between them. When several sources are shown, judge whether they TOGETHER establish the claim.",
  "",
  "- supported: the sources state or clearly imply the whole claim, its relationship included.",
  "  You MUST copy a verbatim snippet from one source into `quote` as proof.",
  "- weak: the sources are on-topic / the right ones, but no single line proves the specific",
  "  point — in particular a link the sources do not establish. Reserve for genuine thinness.",
  "- unsupported: the sources are about something else — the claim could not be drawn from them.",
  "",
  "`quote` must be copied EXACTLY from one source, character for character — never paraphrase,",
  "never invent. If you cannot find a real snippet that proves the claim, leave `quote` empty and",
  "do NOT answer 'supported'. Keep `reason` to one short line.",
].join("\n");

function clampBody(body: string, cap: number): string {
  if (body.length <= cap) return body;
  return `${body.slice(0, cap).trimEnd()}… [truncated]`;
}

export function finalizeClaim(
  sources: Artifact[],
  raw: z.infer<typeof claimSchema>,
): {
  status: EntailmentStatus;
  quote: string | null;
  quoteSourceId: string | null;
  reason: string;
} {
  if (raw.status === "unsupported") {
    return { status: "unsupported", quote: null, quoteSourceId: null, reason: raw.reason };
  }
  let quote: string | null = null;
  let quoteSourceId: string | null = null;
  for (const s of sources) {
    const v = verifyQuote(s.body, raw.quote);
    if (v) {
      quote = v;
      quoteSourceId = s.id;
      break;
    }
  }
  if (raw.status === "supported" && !quote) {
    return {
      status: "weak",
      quote: null,
      quoteSourceId: null,
      reason: withUnverifiedNote(raw.reason),
    };
  }
  return { status: raw.status, quote, quoteSourceId, reason: raw.reason };
}

export async function judgeClaim(
  question: string,
  claimText: string,
  sources: Artifact[],
  model: Model,
): Promise<z.infer<typeof claimSchema>> {
  const rendered = sources
    .map((a) => {
      const who = a.author?.name ? ` · ${a.author.name}` : "";
      return `[${a.id}] ${a.kind} · ${a.date.slice(0, 10)}${who}:\n${clampBody(a.body, JUDGE_BODY_CAP)}`;
    })
    .join("\n\n---\n\n");
  const lead =
    sources.length > 1
      ? `The claim cites ${sources.length} sources — judge whether they TOGETHER substantiate it:`
      : "Source being audited:";
  const prompt = [
    `Question: ${question}`,
    "",
    "Claim under review:",
    claimText,
    "",
    lead,
    rendered,
  ].join("\n");

  const { object } = await generateObject({
    model,
    schema: claimSchema,
    system: CLAIM_SYSTEM,
    prompt,
    temperature: 0,
  });
  return object;
}

type ClaimTask = { index: number; text: string; sources: Artifact[] };

export async function entailClaims(
  question: string,
  claims: Claim[],
  byId: Map<string, Artifact>,
  auditor: Auditor,
): Promise<Entailment> {
  const known = new Set(byId.keys());
  const tasks: ClaimTask[] = claims
    .map((c, index) => ({
      index,
      text: c.text,
      sources: Array.from(new Set(canonicalCitations(c.citations, known)))
        .map((id) => byId.get(id))
        .filter((a): a is Artifact => Boolean(a)),
    }))
    .filter((t) => t.sources.length > 0)
    .slice(0, MAX_CHECKS);
  if (tasks.length === 0) return EMPTY;

  const settled = await Promise.allSettled(
    tasks.map((t) =>
      runAudit(auditor, (model) => judgeClaim(question, t.text, t.sources, model)).then(
        ({ value, fellBack }) => ({ t, fellBack, verdict: finalizeClaim(t.sources, value) }),
      ),
    ),
  );

  const checks: CitationCheck[] = [];
  let supported = 0;
  let misattributed = 0;
  let failed = 0;
  let fallbacks = 0;
  for (const s of settled) {
    if (s.status !== "fulfilled") {
      failed++;
      continue;
    }
    const { t, verdict, fellBack } = s.value;
    if (fellBack) fallbacks++;
    if (verdict.status === "supported") supported++;
    else if (verdict.status === "unsupported") misattributed++;
    for (const src of t.sources) {
      checks.push({
        citation: src.id,
        claim: t.index,
        status: verdict.status,
        quote: verdict.quoteSourceId === src.id ? verdict.quote : null,
        reason: verdict.reason,
      });
    }
  }
  if (checks.length === 0) return { ...EMPTY, failed, fallbacks };

  return { checked: true, checks, supported, misattributed, failed, fallbacks };
}

export async function checkEntailment(
  ev: Evidence,
  n: Narrative,
  auditor: Auditor,
): Promise<Entailment> {
  if (!n.answerable || !n.recorded) return EMPTY;
  return entailClaims(ev.question, n.claims, new Map(ev.artifacts.map((a) => [a.id, a])), auditor);
}
