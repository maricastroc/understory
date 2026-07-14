import { generateObject } from "ai";
import { z } from "zod";
import type { Model } from "./llm";
import type { Artifact, CitationCheck, Entailment, Evidence, Narrative } from "./types";

const MAX_CHECKS = 6;
const JUDGE_BODY_CAP = 1_600;
const QUOTE_MIN = 8;

const EMPTY: Entailment = { checked: false, checks: [], supported: 0, misattributed: 0 };

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

const normalize = (s: string): string => s.replace(/\s+/g, " ").trim().toLowerCase();

export function verifyQuote(body: string, quote: string): string | null {
  const q = quote.trim();
  if (q.length < QUOTE_MIN) return null;
  return normalize(body).includes(normalize(q)) ? q : null;
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

function judge(ev: Evidence, n: Narrative, a: Artifact, model: Model): Promise<CitationCheck> {
  return judgeCitation(ev.question, n.answer, a, model);
}

export async function checkEntailment(
  ev: Evidence,
  n: Narrative,
  model: Model,
): Promise<Entailment> {
  if (!n.answerable || !n.recorded) return EMPTY;

  const byId = new Map(ev.artifacts.map((a) => [a.id, a]));
  const cited = Array.from(new Set(n.citations)).filter((id) => byId.has(id));
  if (cited.length === 0) return EMPTY;

  const settled = await Promise.allSettled(
    cited.slice(0, MAX_CHECKS).map((id) => judge(ev, n, byId.get(id)!, model)),
  );
  const checks = settled
    .filter((s): s is PromiseFulfilledResult<CitationCheck> => s.status === "fulfilled")
    .map((s) => s.value);
  if (checks.length === 0) return EMPTY;

  return {
    checked: true,
    checks,
    supported: checks.filter((c) => c.status === "supported").length,
    misattributed: checks.filter((c) => c.status === "unsupported").length,
  };
}
