import { generateObject } from "ai";
import { z } from "zod";
import type { Language, Model } from "../llm";
import type { BlameTarget, DiffCluster, DiffCollection, DiffNarrative } from "./types";

const findingSchema = z.object({
  cluster: z.string().describe("The region label exactly as shown, e.g. 'C1'."),
  why: z
    .string()
    .describe(
      "A short historical reconstruction of the EXISTING code being changed here, written for a new teammate: what problem brought it into being, how the changes since then connect and accreted, and how it reached the shape this PR now touches. Weave this region's commits/PRs/reviews/issues into ONE causal account, not a timeline of separate facts. This is RECORDED HISTORY only — do NOT say why the current PR touches it (that belongs in `connection`). State only what the sources establish: do NOT assert a benefit or objective (safer, faster, cleaner, more correct) unless a source says so — if the record does not give the reason, say so rather than supplying one.",
    ),
  connection: z
    .string()
    .describe(
      "One or two sentences on why THIS PR's stated purpose inevitably lands on this region — the through-line from the history in `why` to the change now in front of the reviewer. This is an INFERENCE from the history plus the PR, NOT recorded history and NOT a citation-backed claim; keep it OUT of `why`. Leave EMPTY ('') if the connection is not evident from the evidence.",
    ),
  citations: z
    .array(z.string())
    .describe(
      "Exact artifact ids the `why` relies on, copied verbatim, e.g. 'commit:abc123', 'pr:42'. Only ids from this region's evidence. `connection` is not cited.",
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
  "history; do not summarize commits. Keep two things strictly apart: `why` is RECORDED HISTORY",
  "(auditable, cited); `connection` is your INFERENCE about the current PR (not history, not cited).",
  "For EACH region, using ONLY that region's evidence:",
  "- In `why`, tell the story of the EXISTING code: what problem brought it into being, and how the",
  "  fixes, reworks and decisions since then connect and accreted into the shape this PR now touches.",
  "  Weave the region's commits, PRs, reviews and issues into ONE causal account, not a timeline of",
  "  separate facts. Put the exact ids you drew on in `citations`, copied verbatim. This is history —",
  "  a reconstruction, not a changelog line — and it must NOT talk about the current PR.",
  "- In `connection`, CLOSE THE LOOP: one or two sentences on why THIS PR's stated purpose inevitably",
  "  lands on this region — the through-line from the history above to the change now in front of the",
  "  reviewer. It is not enough that the code merely exists here; explain why those threads left code",
  "  this PR must touch. This is an INFERENCE from the history plus the PR, NOT recorded history; keep",
  "  it OUT of `why` and do not treat it as a cited fact. If the evidence does not make the connection",
  "  evident, leave `connection` empty rather than manufacturing one.",
  "",
  "Interpret; do not invent. You MAY frame, sequence and contextualize what the sources establish,",
  "and name an intent they state or clearly imply. Naming what the record does AND does not settle",
  "is itself grounded and is often the most useful thing you can say — 'the record shows this was",
  "for compiler compatibility, not for an observed production bug' beats both a flat restatement and",
  "an invented motivation. But NEVER assert a motivation, cause or intent no source records: on",
  "those points, say the history does not record it. In particular, do NOT tack on evaluative",
  "benefit clauses — 'reinforcing security and efficiency', 'improving readability', 'strengthening",
  "correctness' — unless a source explicitly states that benefit; if the record shows only WHAT",
  "changed, report what changed and stop. A conservative account beats an impressive one that",
  "outruns the evidence. If a region's evidence does not actually explain the code (e.g. the commit",
  "only says 'fix'), set recorded=false and say so. Never invent a reason to fill the gap.",
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
