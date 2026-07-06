import { generateObject } from "ai";
import { z } from "zod";
import { model } from "./llm";
import type { Evidence, Narrative } from "./types";

const narrativeSchema = z.object({
  answerable: z
    .boolean()
    .describe(
      "false if the question is off-topic, nonsensical, or cannot be answered from this code's history at all — do NOT reinterpret it as 'why does this code exist'. true otherwise.",
    ),
  answer: z
    .string()
    .describe(
      "When answerable: a prose answer to the question, from the evidence, in the question's language. When not answerable: one line stating the question is outside what this code's history can answer.",
    ),
  citations: z
    .array(z.string())
    .describe(
      "Exact artifact ids the answer relies on, e.g. 'commit:c038fb3'. Only ids from the evidence; empty when not answerable.",
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
  "  commits/PRs/issues/reviews simply cannot speak to, set answerable=false, write one",
  "  line saying the question is outside what this code's history can answer, leave",
  "  citations empty, set recorded=false, and STOP. Do NOT reinterpret the question as",
  "  'why does this code exist'.",
  "- Otherwise set answerable=true and answer it from the evidence, following the rules.",
  "",
  "Rules (when answerable):",
  "- Every claim must be backed by an evidence item. Put that item's exact id",
  "  (e.g. commit:c038fb3) in `citations`, copied verbatim from the brackets.",
  "- If the evidence does NOT actually answer the question (e.g. the commits only say",
  "  'fix' with no reasoning), set recorded=false and say plainly that the history",
  "  does not explain it. Never invent a motivation to fill the gap.",
  "- Be concise and factual. No hedging, no filler, no apologies.",
  "- LANGUAGE: write `answer` in the same language as the Question line, detected",
  "  from the Question ALONE. The evidence may be in other languages (Japanese,",
  "  etc.); that must NEVER change the answer's language. An English question gets",
  "  an English answer even if every cited source is in another language.",
  "- Only cite ids that literally appear in the evidence. Never fabricate an id.",
].join("\n");

// The synthesis model is rate-limited by tokens-per-minute, so the prompt has a size
// budget. Every artifact's id header is always kept (citations depend on it); only the
// bodies are trimmed, shared across however many exhibits were collected. Small
// investigations stay untouched — this only bites the large ones that would otherwise
// blow the limit and fail outright.
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

export function buildSynthesisInput(ev: Evidence): { system: string; prompt: string } {
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
  return { system: SYSTEM, prompt };
}

export async function synthesize(ev: Evidence): Promise<Narrative> {
  const { system, prompt } = buildSynthesisInput(ev);
  const { object } = await generateObject({
    model,
    schema: narrativeSchema,
    system,
    prompt,
    temperature: 0,
  });
  return object;
}
