import { generateObject } from "ai";
import { z } from "zod";
import { renderCode } from "./collect/code-context";
import type { Language, Model } from "./llm";
import type { Evidence, Narrative } from "./types";

const claimSchema = z.object({
  text: z
    .string()
    .describe(
      "One assertion in the reconstruction — a step in the story of how this code came to be, in prose, in the question's language. Read in order, the claims form one narrative, not a list of commit summaries.",
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
      "When answerable AND the history explains it: the reconstruction, broken into factual assertions, each with its own citations. Ordered and self-contained so that, read together, they tell the story of why this code is the way it is — what problem it solved, why the approach made sense, and how it evolved. Empty when abstaining or out of scope.",
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
  "(or lines) of code — the problem it solved, why it was written that way, and how it",
  "evolved — using ONLY the evidence provided. Never outside knowledge, never a guess.",
  "",
  "FIRST decide whether the question can be answered from this evidence at all:",
  "- If it is off-topic, nonsensical, or asks about something the collected",
  "  commits/PRs/issues/reviews simply cannot speak to, set answerable=false, put one",
  "  line in `answer` saying the question is outside what this code's history can answer,",
  "  leave `claims` empty, set recorded=false, and STOP. Do NOT reinterpret the question",
  "  as 'why does this code exist'.",
  "- Otherwise set answerable=true and reconstruct it from the evidence, following the rules.",
  "",
  "Rules (when answerable):",
  "- Tell the story; do not summarize commits. Break the reconstruction into CLAIMS, each ONE",
  "  assertion in `claims` as { text, citations }. Ordered and self-contained, the claims read",
  "  together as one narrative — what problem existed, why this approach made sense at the time,",
  "  and how it reached its current form — not a bullet list of changes.",
  "- Every claim MUST cite at least one evidence item: put that item's exact id",
  "  (e.g. commit:c038fb3) in the claim's `citations`, copied verbatim from the brackets.",
  "  If you cannot back an assertion with a collected source, do NOT write it — silence is",
  "  better than an uncited claim. Never state a motivation no source records.",
  "- Interpret; do not invent. You MAY frame and connect what the sources establish, and name an",
  "  intent they state or clearly imply. Naming what the record does AND does not settle is itself",
  "  grounded — 'the record shows this was for compiler compatibility, not an observed bug' beats",
  "  both a flat restatement and an invented motivation. But never assert a cause no source records,",
  "  and never tack on an unsupported benefit clause ('improving safety', 'making it faster'): if a",
  "  source does not state the benefit, leave it out. A conservative claim beats one that overruns.",
  "- If the evidence does NOT actually answer the question (e.g. the commits only say",
  "  'fix' with no reasoning), set recorded=false, leave `claims` empty, and put one honest",
  "  line in `answer` saying the history does not explain it. Never invent a motivation.",
  "- Write plainly and concretely; no hedging, no apologies.",
  "- Only cite ids that literally appear in the evidence. Never fabricate an id.",
].join("\n");

const CODE_RULES = [
  "- The prompt shows the code under investigation and, when it is known, what the last change did",
  "  to the marked line: added it, or rewrote it from what it read before. This is there so you can",
  "  tell what the evidence is ABOUT. It is not evidence: never cite it, and never infer from it why",
  "  the code was written. Reasons come only from the evidence.",
  "- First ask: is this code part of the thing the evidence describes?",
  "  YES when the evidence describes a feature, a fix, a shim, a refactor or a rename and this code",
  "  is a piece of it: a line the change added to build it, in its implementation, its tests, its",
  "  documentation or examples, or a line the change rewrote in the way the evidence describes. A",
  "  line with no decision of its own (a doc-comment line, a tag, a signature, an import, a brace)",
  "  is still a piece of it, and is explained by the thing it belongs to. No source singles out one",
  "  line or explains its exact wording, so do not look for that and do not abstain for lack of it.",
  "  The recorded reason the code exists is then the reason for that thing: set recorded=true and",
  "  write the claims.",
  "  NO when the evidence is about something else and this code was only moved, renamed,",
  "  reformatted or adjusted on the way, or when what the change did to the line is not what the",
  "  evidence talks about. A reason the evidence gives for another part of the change is NOT a",
  "  reason for this code. Then do not fill the gap from the code: set recorded=false, leave",
  "  `claims` empty, and say in `answer` which change last touched the code, what it did to the line",
  "  if the prompt says so, and that the record does not explain it.",
  "- A claim says what the EVIDENCE says about the change: what it did and why, in the evidence's",
  "  own terms, so that a sentence of the evidence could be quoted for the whole claim. Do NOT",
  "  explain the code. Never write what it does, checks, returns, loops over or is for, neither as",
  "  a claim nor as a clause added to one ('..., providing a way to ...', '..., so that it can",
  "  ...'), unless the evidence says exactly that. The reader can see the code; the audit rejects a",
  "  claim for any part that is not in the evidence.",
  "- Point at the code only to say which code you mean, in a few words: 'this line', 'this method',",
  "  'this doc-comment line'. Never say it is something the code shown is not.",
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
const MAX_OUTPUT_TOKENS = 4_000;

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

export function formatTarget(ev: Evidence): string {
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
  const code = ev.code && ev.location ? renderCode(ev.code, ev.location) : null;
  const prompt = [
    `Question: ${ev.question}`,
    targetLine,
    ...(code ? ["", code] : []),
    "",
    "Evidence:",
    ev.artifacts.length ? renderEvidence(ev) : "(no evidence was collected)",
  ].join("\n");
  const rules = code ? `${SYSTEM}\n${CODE_RULES}` : SYSTEM;
  return { system: `${rules}\n${languageRule(language)}`, prompt };
}

export function toNarrative(object: z.infer<typeof narrativeSchema>): Narrative {
  const useClaims = object.answerable && object.recorded && object.claims.length > 0;
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
    maxOutputTokens: MAX_OUTPUT_TOKENS,
  });
  return toNarrative(object);
}
