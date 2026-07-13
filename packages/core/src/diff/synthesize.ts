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
    .describe("true if the evidence genuinely explains it; false = honest abstention (history is silent)."),
});

const schema = z.object({
  summary: z
    .string()
    .describe(
      "1–3 sentences: what the reviewer most needs to know before approving, leading with anything risky or contested. If nothing stands out, say so plainly.",
    ),
  findings: z.array(findingSchema),
});

const SYSTEM = [
  "You are a code-review assistant. A reviewer is looking at a pull request; your job is to",
  "reconstruct why the EXISTING code being changed exists, so they know what they are touching.",
  "You are given the changed regions (C1, C2, …), each with the commits, pull requests, reviews",
  "and issues behind the code being changed.",
  "",
  "For EACH region, using ONLY that region's evidence:",
  "- Explain why that existing code exists or what it was for. Put the exact ids you used in",
  "  `citations` (e.g. commit:abc123, pr:42), copied verbatim from the brackets.",
  "- If the evidence does NOT actually explain it (e.g. the commit only says 'fix'), set",
  "  recorded=false and say the history doesn't explain it. Never invent a reason to fill the gap.",
  "- Be concise: one or two sentences. No filler, no hedging.",
  "",
  "Then write `summary`: the 1–3 things the reviewer most needs to know before approving. Lead with",
  "anything risky or contested — a change to code that was reverted, that fixed an incident, or that",
  "was argued over in review. If nothing stands out, say so plainly.",
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
    .map((t) => `${t.path}:${t.range.start}${t.range.end !== t.range.start ? `-${t.range.end}` : ""}`)
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
  const perItem = Math.min(MAX_BODY, Math.max(MIN_BODY, Math.floor(EVIDENCE_BUDGET / Math.max(1, totalArtifacts))));
  const regions = col.clusters.map((c, i) => renderCluster(c, clusterRef(i), perItem)).join("\n\n---\n\n");
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
