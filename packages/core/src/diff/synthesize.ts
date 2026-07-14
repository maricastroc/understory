import { generateObject } from "ai";
import { z } from "zod";
import type { Language, Model } from "../llm";
import type { BlameTarget, DiffCluster, DiffCollection, DiffNarrative } from "./types";

const findingSchema = z.object({
  cluster: z.string().describe("The region label exactly as shown, e.g. 'C1'."),
  why: z
    .string()
    .describe(
      "Why the EXISTING code being changed here exists / what it was for — from this region's evidence only. One or two sentences.",
    ),
  citations: z
    .array(z.string())
    .describe(
      "Exact artifact ids this relies on, copied verbatim, e.g. 'commit:abc123', 'pr:42'. Only ids from this region's evidence.",
    ),
  recorded: z
    .boolean()
    .describe(
      "true if the evidence genuinely explains it; false = honest abstention (history is silent).",
    ),
});

const schema = z.object({
  summary: z
    .string()
    .describe(
      "2–4 sentences of executive history: why the code this PR changes was introduced, then — only as a consequence — which regions carry the heaviest or most-contested past. Grounded in the evidence; never a description of the diff or generic review advice.",
    ),
  findings: z.array(findingSchema),
});

const SYSTEM = [
  "You are a software archaeologist. A pull request is changing existing code; your job is to",
  "reconstruct WHY that existing code was there in the first place — the reasons, decisions and",
  "incidents behind it — from the recorded history ALONE. This is the same question the line-level",
  "investigator answers, asked of every region a PR touches. You are given the changed regions",
  "(C1, C2, …), each with the commits, pull requests, reviews and issues behind the code.",
  "",
  "For EACH region, using ONLY that region's evidence:",
  "- Explain why that existing code exists or what it was for. Put the exact ids you used in",
  "  `citations` (e.g. commit:abc123, pr:42), copied verbatim from the brackets.",
  "- If the evidence does NOT actually explain it (e.g. the commit only says 'fix'), set",
  "  recorded=false and say the history doesn't explain it. Never invent a reason to fill the gap.",
  "- Be concise: one or two sentences. No filler, no hedging.",
  "",
  "Then write `summary`: 2–4 sentences of executive context for whoever reads this PR next.",
  "LEAD with why the code this PR changes was introduced — the mechanisms it touches and the",
  "reasons, decisions or incidents that shaped them, drawn only from the evidence. THEN, and only",
  "as a consequence of that history, note which region(s) carry the weightiest or most-contested",
  "past (code that was reverted, that fixed an incident, or that was argued over in review) and so",
  "deserve the closest read. Do NOT describe what the diff does, do NOT restate the PR description,",
  "and do NOT give generic review advice like 'verify that…' or 'this may impact…'. If the recorded",
  "history is thin, say that plainly instead of inventing significance.",
  "Only cite ids that literally appear in the evidence; never fabricate one.",
].join("\n");

function languageRule(language: Language): string {
  return language === "pt"
    ? "Write `summary` and every `why` in Brazilian Portuguese (pt-BR)."
    : "Write `summary` and every `why` in English.";
}

const EVIDENCE_BUDGET = 12_000;
const MAX_BODY = 1_500;
const MIN_BODY = 200;

export const clusterRef = (i: number): string => `C${i + 1}`;

function clamp(body: string, cap: number): string {
  if (body.length <= cap) return body;
  return `${body.slice(0, cap).trimEnd()}… [truncated]`;
}

export function formatTargets(targets: BlameTarget[]): string {
  return targets
    .map(
      (t) => `${t.path}:${t.range.start}${t.range.end !== t.range.start ? `-${t.range.end}` : ""}`,
    )
    .join(", ");
}

function renderCluster(cluster: DiffCluster, ref: string, perItem: number): string {
  const evidence = cluster.artifacts
    .map((a) => `[${a.id}] ${a.kind} · ${a.date.slice(0, 10)}\n${clamp(a.body, perItem)}`)
    .join("\n\n");
  return `### ${ref} — code changed at ${formatTargets(cluster.targets)}\n${evidence || "(no recorded history)"}`;
}

export function buildDiffSynthesisInput(
  col: DiffCollection,
  language: Language = "auto",
): { system: string; prompt: string } {
  const totalArtifacts = col.clusters.reduce((n, c) => n + c.artifacts.length, 0);
  const perItem = Math.min(
    MAX_BODY,
    Math.max(MIN_BODY, Math.floor(EVIDENCE_BUDGET / Math.max(1, totalArtifacts))),
  );
  const regions = col.clusters
    .map((c, i) => renderCluster(c, clusterRef(i), perItem))
    .join("\n\n---\n\n");
  const prompt = [
    `Pull request #${col.pr.number}: ${col.pr.title}`,
    `Repository: ${col.repo.name ?? col.repo.path}`,
    "",
    "Changed regions:",
    col.clusters.length ? regions : "(no changed code with recorded history)",
  ].join("\n");
  return { system: `${SYSTEM}\n${languageRule(language)}`, prompt };
}

export async function synthesizeDiff(
  col: DiffCollection,
  model: Model,
  language: Language = "auto",
): Promise<DiffNarrative> {
  const { system, prompt } = buildDiffSynthesisInput(col, language);
  const { object } = await generateObject({ model, schema, system, prompt, temperature: 0 });
  return object;
}
