import { generateObject } from "ai";
import { z } from "zod";
import { renderCode } from "./collect/code-context";
import type { Language, Model } from "./llm";
import { owningCommit } from "./provenance";
import { languageRule } from "./synthesize";
import type { Evidence, Narrative } from "./types";

const EVIDENCE_CHAR_BUDGET = 8_000;
const MAX_BODY = 1_200;
const MIN_BODY = 280;
const MAX_OUTPUT_TOKENS = 1_000;

const schema = z.object({
  belongs: z
    .boolean()
    .describe(
      "true if this code belongs to something the evidence gives a reason for, or if the evidence gives no reasons at all; false only if the evidence gives reasons and they are for other parts of the change.",
    ),
  answer: z
    .string()
    .describe(
      "Used ONLY when belongs is false: one honest line naming the change that last touched the code and saying the record does not explain this code. Empty when belongs is true.",
    ),
});

export type Relevance = z.infer<typeof schema>;

const SYSTEM = [
  "You decide one thing about a piece of code and the history collected for it: whether that",
  "history is ABOUT this code. You are shown the code, and the evidence behind the change that last",
  "touched it: commits, pull requests, issues and reviews.",
  "",
  "A commit or pull request usually changes many things, and the evidence gives reasons for some",
  "of them.",
  "- The code BELONGS when it was added or changed to deliver something the evidence gives a",
  "  reason for: a feature's implementation, its documentation, its tests, the declarations it",
  "  needs, the fix or the cleanup the evidence describes.",
  "- The code DOES NOT BELONG when the change merely swept it along: a line it moved, reformatted,",
  "  or rewrote for a purpose other than the ones the evidence gives.",
  "",
  "Rules:",
  "- Decide from what the code is and what the evidence says. Never guess a purpose for the code.",
  "- You are not answering the question. Whether it is in scope, and whether the evidence explains",
  "  enough, is decided later. If the evidence gives no reasons at all, set belongs=true.",
  "- If in doubt, set belongs=true.",
  "- When belongs is false, write one line in `answer` that names the change that last touched the",
  "  code and says the record does not explain this code. Do not say what the code is for.",
].join("\n");

function clampBody(body: string, cap: number): string {
  return body.length <= cap ? body : `${body.slice(0, cap).trimEnd()}… [truncated]`;
}

export function buildRelevanceInput(
  ev: Evidence,
  language: Language = "auto",
): { system: string; prompt: string } | null {
  if (!ev.code || !ev.location || ev.artifacts.length === 0) return null;
  const perItem = Math.min(
    MAX_BODY,
    Math.max(MIN_BODY, Math.floor(EVIDENCE_CHAR_BUDGET / ev.artifacts.length)),
  );
  const evidence = ev.artifacts
    .map((a) => `[${a.id}] ${a.kind} · ${a.date.slice(0, 10)}\n${clampBody(a.body, perItem)}`)
    .join("\n\n---\n\n");
  const owner = owningCommit(ev);
  const prompt = [
    `Question: ${ev.question}`,
    `Code location: ${ev.location.file}:${ev.location.startLine}`,
    "",
    renderCode(ev.code, ev.location),
    ...(owner ? ["", `Blame: last changed by [${owner.id}], "${owner.title}".`] : []),
    "",
    "Evidence:",
    evidence,
  ].join("\n");
  return { system: `${SYSTEM}\n${languageRule(language)}`, prompt };
}

export async function checkRelevance(
  ev: Evidence,
  model: Model,
  language: Language = "auto",
): Promise<Relevance | null> {
  const input = buildRelevanceInput(ev, language);
  if (!input) return null;
  const { object } = await generateObject({
    model,
    schema,
    system: input.system,
    prompt: input.prompt,
    temperature: 0,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
  });
  return object;
}

export function sweptAlong(relevance: Relevance | null): Narrative | null {
  if (!relevance || relevance.belongs || !relevance.answer.trim()) return null;
  return {
    answerable: true,
    recorded: false,
    claims: [],
    answer: relevance.answer.trim(),
    citations: [],
  };
}
