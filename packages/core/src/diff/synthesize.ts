import { generateObject } from "ai";
import { z } from "zod";
import type { Language, Model } from "../llm";
import type { BlameTarget, DiffCluster, DiffCollection, DiffNarrative } from "./types";

const findingSchema = z.object({
  cluster: z.string().describe("The region label exactly as shown, e.g. 'C1'."),
  why: z
    .string()
    .describe(
      "A short historical reconstruction of the EXISTING code being changed here, written for a new teammate: what problem or need brought it into being, why that approach made sense then, and — where the record shows it — how it reached the shape this PR now touches and why it is notable that the PR touches it. Weave this region's commits/PRs/reviews/issues into ONE account, not an artifact-by-artifact summary. A few sentences of real substance, not a changelog line. Interpret what the sources establish; never assert a motivation no source records, and do not tack on an unsupported benefit ('safer', 'faster', 'cleaner') unless a source says so.",
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

const summaryClaimSchema = z.object({
  text: z
    .string()
    .describe(
      "One sentence of executive history for whoever reviews this PR next — part of a synthesis across the regions, not a description of the diff.",
    ),
  citations: z
    .array(z.string())
    .describe(
      "Exact artifact id(s) from ANY region that back THIS sentence, copied verbatim (e.g. commit:abc123, pr:42). Every historical sentence must cite at least one.",
    ),
});

const schema = z.object({
  summaryClaims: z
    .array(summaryClaimSchema)
    .describe(
      "2–5 executive-history sentences, EACH a separately-cited claim. Together they should place the whole review in context: name the distinct historical threads the changed code belongs to (a modernization, an old algorithm, a later cleanup, …), then which region(s) carry the heaviest or most-contested past and why it matters that this PR touches them. A synthesis across regions, not a concatenation of them; grounded in the evidence; never a description of the diff or generic review advice.",
    ),
  findings: z.array(findingSchema),
});

const SYSTEM = [
  "You are a software archaeologist. A pull request is changing existing code; your job is to",
  "reconstruct WHY that existing code was there — the problems, decisions and incidents behind it —",
  "and hand the next reviewer a history they can trust, from the recorded evidence ALONE. You are",
  "given the changed regions (C1, C2, …), each with the commits, pull requests, reviews and issues",
  "behind the code it touches.",
  "",
  "Write for an engineer who just joined the team and is about to review this PR. Reconstruct the",
  "history; do not summarize commits. For EACH region, using ONLY that region's evidence, tell the",
  "story of the code being changed:",
  "- What problem or need brought this code into being, and why the chosen approach made sense then.",
  "- How it reached the shape this PR now touches — the fixes, reworks or decisions along the way.",
  "  Weave the region's commits, PRs, reviews and issues into ONE account; do not narrate them one",
  "  by one. Where the record allows, say why this code has survived and why it is notable that this",
  "  PR is touching it.",
  "- Put the exact ids you drew on in `citations` (e.g. commit:abc123, pr:42), copied verbatim.",
  "- A few sentences of real substance — a reconstruction, not a changelog line.",
  "",
  "Interpret; do not invent. You MAY frame, sequence and contextualize what the sources establish,",
  "and name an intent they state or clearly imply. Naming what the record does AND does not settle",
  "is itself grounded and is often the most useful thing you can say — 'the record shows this was",
  "for compiler compatibility, not for an observed production bug' beats both a flat restatement and",
  "an invented motivation. But NEVER assert a motivation, cause or intent no source records: on",
  "those points, say the history does not record it. Do NOT tack on unsupported benefit clauses",
  "('reinforcing security and efficiency', 'improving readability') unless a source states the",
  "benefit. If a region's evidence does not actually explain the code (e.g. the commit only says",
  "'fix'), set recorded=false and say so. Never invent a reason to fill the gap.",
  "",
  "Then write `summaryClaims`: the executive history for whoever reviews this PR next, EACH sentence",
  "a separate claim with its own `citations` (same rule as the findings). Do NOT just concatenate",
  "the regions — step up a level. Name the distinct historical threads the changed code belongs to",
  "(a modernization, an old algorithm, a later cleanup, …), then say which region(s) carry the",
  "heaviest or most-contested past — code that was reverted, that fixed an incident, or that was",
  "argued over in review — and why it matters that this PR touches them. Every sentence MUST cite at",
  "least one artifact id; if you cannot back a sentence with a collected source, do not write it. Do",
  "NOT describe what the diff does, do NOT restate the PR description, and do NOT give generic review",
  "advice like 'verify that…'. If the recorded history is thin, say that plainly instead of",
  "inventing significance.",
  "Only cite ids that literally appear in the evidence; never fabricate one.",
].join("\n");

function languageRule(language: Language): string {
  return language === "pt"
    ? "Write every `summaryClaims` text and every `why` in Brazilian Portuguese (pt-BR)."
    : "Write every `summaryClaims` text and every `why` in English.";
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
