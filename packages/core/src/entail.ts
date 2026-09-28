import { generateObject } from "ai";
import { z } from "zod";
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

export { verifyQuote };

const EMPTY: Entailment = { checked: false, checks: [], supported: 0, misattributed: 0 };

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

const checkSchema = z.object({
  status: z
    .enum(["supported", "weak", "unsupported"])
    .describe(
      "supported = the source's text states or clearly implies the fact(s) the answer draws from it (quote required); weak = clearly the right source / on-topic, but no single line proves the point; unsupported = the source is about something else and the answer could NOT have come from it (a misattribution).",
    ),
  quote: z
    .string()
    .describe(
      "For 'supported': a snippet copied VERBATIM from the source text that proves the fact (character for character, never paraphrased). Empty string otherwise.",
    ),
  reason: z
    .string()
    .describe("One short line: why the source does or does not substantiate the claim."),
});

const SYSTEM = [
  "You are a citation auditor. An answer about a line of code's history relies on ONE source.",
  "The answer may weave together several facts; judge ONLY the part(s) this source is cited",
  "for — not the whole answer. Judge ONLY from the source text shown — never from outside",
  "knowledge, never from other sources, never from what merely seems plausible.",
  "",
  "- supported: the source states or clearly implies the fact(s) the answer draws from it. You",
  "  MUST copy a verbatim snippet into `quote` as proof. If it is plainly the PR/commit/issue",
  "  the answer names, quote the line that shows it.",
  "- weak: it is clearly the right source or on-topic, but no single line proves the specific",
  "  point. Reserve this for genuine thinness, not for being one part of a larger answer.",
  "- unsupported: the source is about something else entirely — the answer could not have been",
  "  drawn from it. This is a misattribution and the only verdict that lowers confidence.",
  "",
  "`quote` must be copied EXACTLY from the source, character for character — never paraphrase,",
  "never invent. If you cannot find a real supporting snippet, leave `quote` empty and do NOT",
  "answer 'supported'. Keep `reason` to one short line.",
].join("\n");

function clampBody(body: string, cap: number): string {
  if (body.length <= cap) return body;
  return `${body.slice(0, cap).trimEnd()}… [truncated]`;
}

export function finalizeCheck(
  citation: string,
  body: string,
  raw: z.infer<typeof checkSchema>,
): CitationCheck {
  if (raw.status === "unsupported") {
    return { citation, status: "unsupported", quote: null, reason: raw.reason };
  }
  const verified = verifyQuote(body, raw.quote);
  if (raw.status === "supported" && !verified) {
    const note = "the cited quote was not found in the source";
    return {
      citation,
      status: "unsupported",
      quote: null,
      reason: raw.reason ? `${raw.reason} (${note})` : note,
    };
  }
  return { citation, status: raw.status, quote: verified, reason: raw.reason };
}

export async function judgeCitation(
  question: string,
  answer: string,
  a: Artifact,
  model: Model,
): Promise<CitationCheck> {
  const who = a.author?.name ? ` · ${a.author.name}` : "";
  const prompt = [
    `Question: ${question}`,
    "",
    "Answer under review:",
    answer,
    "",
    `Source being audited — [${a.id}] ${a.kind} · ${a.date.slice(0, 10)}${who}:`,
    clampBody(a.body, JUDGE_BODY_CAP),
  ].join("\n");

  const { object } = await generateObject({
    model,
    schema: checkSchema,
    system: SYSTEM,
    prompt,
    temperature: 0,
  });
  return finalizeCheck(a.id, a.body, object);
}

export function finalizeClaim(
  sources: Artifact[],
  raw: z.infer<typeof claimSchema>,
): { status: EntailmentStatus; quote: string | null; quoteSourceId: string | null; reason: string } {
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
    const note = "the cited quote was not found in the source";
    return {
      status: "unsupported",
      quote: null,
      quoteSourceId: null,
      reason: raw.reason ? `${raw.reason} (${note})` : note,
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
  model: Model,
): Promise<Entailment> {
  const tasks: ClaimTask[] = claims
    .map((c, index) => ({
      index,
      text: c.text,
      sources: Array.from(new Set(c.citations))
        .map((id) => byId.get(id))
        .filter((a): a is Artifact => Boolean(a)),
    }))
    .filter((t) => t.sources.length > 0)
    .slice(0, MAX_CHECKS);
  if (tasks.length === 0) return EMPTY;

  const settled = await Promise.allSettled(
    tasks.map((t) =>
      judgeClaim(question, t.text, t.sources, model).then((raw) => ({
        t,
        verdict: finalizeClaim(t.sources, raw),
      })),
    ),
  );

  const checks: CitationCheck[] = [];
  let supported = 0;
  let misattributed = 0;
  for (const s of settled) {
    if (s.status !== "fulfilled") continue;
    const { t, verdict } = s.value;
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
  if (checks.length === 0) return EMPTY;

  return { checked: true, checks, supported, misattributed };
}

export async function checkEntailment(
  ev: Evidence,
  n: Narrative,
  model: Model,
): Promise<Entailment> {
  if (!n.answerable || !n.recorded) return EMPTY;
  return entailClaims(ev.question, n.claims, new Map(ev.artifacts.map((a) => [a.id, a])), model);
}
