import { generateObject } from "ai";
import { z } from "zod";
import type { Language, Model } from "./llm";
import type { Evidence, Narrative } from "./types";

const claimSchema = z.object({
  text: z
    .string()
    .describe(
      "One factual assertion about this code's history, in prose, in the question's language.",
    ),
  citations: z
    .array(z.string())
    .describe(
      "Exact artifact id(s) that back THIS assertion, copied verbatim from the brackets (e.g. 'commit:c038fb3'). Every factual claim MUST cite at least one collected id. If you cannot back an assertion, do not write it.",
    ),
});

const narrativeSchema = z.object({
  answerable: z
    .boolean()
    .describe(
      "false if the question is off-topic, nonsensical, or cannot be answered from this code's history at all — do NOT reinterpret it as 'why does this code exist'. true otherwise.",
    ),
  claims: z
    .array(claimSchema)
    .describe(
      "When answerable AND the history explains it: the answer, broken into factual assertions, each with its own citations. Written in order and self-contained, so that read together they ARE the answer. Empty when abstaining or out of scope.",
    ),
  answer: z
    .string()
    .describe(
      "Used ONLY when NOT answerable, or when answerable but the history does not explain it: one honest line. Leave EMPTY when you provide claims.",
    ),
  recorded: z
    .boolean()
    .describe("true if the evidence genuinely explains the answer; false = honest abstention."),
});

const SYSTEM = [
  "You are a software archaeologist. You reconstruct the history behind a specific line",
  "(or lines) of code, using ONLY the evidence provided — never outside knowledge,",
  "never a guess.",
  "",
  "FIRST decide whether the question can be answered from this evidence at all:",
  "- If it is off-topic, nonsensical, or asks about something the collected",
  "  commits/PRs/issues/reviews simply cannot speak to, set answerable=false, put one",
  "  line in `answer` saying the question is outside what this code's history can answer,",
  "  leave `claims` empty, set recorded=false, and STOP. Do NOT reinterpret the question",
  "  as 'why does this code exist'.",
  "- Otherwise set answerable=true and answer it from the evidence, following the rules.",
  "",
  "Rules (when answerable):",
  "- Break the answer into CLAIMS. Each claim is ONE factual assertion about this code's",
  "  history, placed in `claims` as { text, citations }. Written in order and",
  "  self-contained, the claims read together as the whole answer.",
  "- Every claim MUST cite at least one evidence item: put that item's exact id",
  "  (e.g. commit:c038fb3) in the claim's `citations`, copied verbatim from the brackets.",
  "  If you cannot back an assertion with a collected source, do NOT write it — silence is",
  "  better than an uncited claim. Never state a motivation no source records.",
  "- If the evidence does NOT actually answer the question (e.g. the commits only say",
  "  'fix' with no reasoning), set recorded=false, leave `claims` empty, and put one honest",
  "  line in `answer` saying the history does not explain it. Never invent a motivation.",
  "- Be concise and factual. No hedging, no filler, no apologies.",
  "- Only cite ids that literally appear in the evidence. Never fabricate an id.",
].join("\n");

function languageRule(language: Language): string {
  if (language === "pt")
    return "- LANGUAGE: write every claim's `text` (and `answer`) in Brazilian Portuguese (pt-BR), no matter what language the question or the evidence is in.";
  if (language === "en")
    return "- LANGUAGE: write every claim's `text` (and `answer`) in English, no matter what language the question or the evidence is in.";
  return [
    "- LANGUAGE: write every claim's `text` (and `answer`) in the same language as the Question",
    "  line, detected from the Question ALONE. The evidence may be in other languages (Japanese,",
    "  etc.); that must NEVER change the answer's language. An English question gets an English",
    "  answer even if every cited source is in another language.",
  ].join("\n");
}

const EVIDENCE_CHAR_BUDGET = 13_000;
const MAX_BODY = 3_000;
const MIN_BODY = 280;

function clampBody(body: string, cap: number): string {
  if (body.length <= cap) return body;
  return `${body.slice(0, cap).trimEnd()}… [truncated]`;
}

function renderEvidence(ev: Evidence): string {
  const perItem = Math.min(
    MAX_BODY,
    Math.max(MIN_BODY, Math.floor(EVIDENCE_CHAR_BUDGET / Math.max(1, ev.artifacts.length))),
  );
  return ev.artifacts
    .map((a) => {
      const when = a.date.slice(0, 10);
      const who = a.author?.name ? ` · ${a.author.name}` : "";
      return `[${a.id}] ${a.kind} · ${when}${who}\n${clampBody(a.body, perItem)}`;
    })
    .join("\n\n---\n\n");
}

function formatTarget(ev: Evidence): string {
  if (ev.location) {
    const { file, startLine, endLine } = ev.location;
    return endLine !== startLine ? `${file}:${startLine}-${endLine}` : `${file}:${startLine}`;
  }
  if (ev.anchor) {
    const a = ev.anchor;
    const kind = a.kind.replace("_", " ");
    return `${kind} ${a.ref ?? a.id}${a.title ? ` — ${a.title}` : ""}`;
  }
  return "(unspecified)";
}

export function buildSynthesisInput(
  ev: Evidence,
  language: Language = "auto",
): { system: string; prompt: string } {
  const targetLine = ev.location
    ? `Code location: ${formatTarget(ev)}`
    : `Anchored on: ${formatTarget(ev)}`;
  const prompt = [
    `Question: ${ev.question}`,
    targetLine,
    "",
    "Evidence:",
    ev.artifacts.length ? renderEvidence(ev) : "(no evidence was collected)",
  ].join("\n");
  return { system: `${SYSTEM}\n${languageRule(language)}`, prompt };
}

// Derive the canonical narrative from the model's structured output. `claims` are the
// single source of truth for an answered question: `answer` is their prose join and
// `citations` their id union, so what the reader sees, what verify grounds, and what
// entailment audits can never drift from one another. Abstention/out-of-scope carry no
// claims and fall back to the model's one-line `answer`.
export function toNarrative(object: z.infer<typeof narrativeSchema>): Narrative {
  const useClaims =
    object.answerable && object.recorded && object.claims.length > 0;
  const claims = useClaims ? object.claims : [];
  const answer = claims.length ? claims.map((c) => c.text).join(" ") : object.answer;
  const citations = Array.from(new Set(claims.flatMap((c) => c.citations)));
  return { answerable: object.answerable, recorded: object.recorded, claims, answer, citations };
}

export async function synthesize(
  ev: Evidence,
  model: Model,
  language: Language = "auto",
): Promise<Narrative> {
  const { system, prompt } = buildSynthesisInput(ev, language);
  const { object } = await generateObject({
    model,
    schema: narrativeSchema,
    system,
    prompt,
    temperature: 0,
  });
  return toNarrative(object);
}
