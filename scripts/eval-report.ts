import { existsSync, readFileSync } from "node:fs";
import type { VerifiedNarrative } from "@understory/core/types";
import type { Outcome } from "./eval-check";

export type MetaRecord = {
  type: "meta";
  date: string;
  commit: string | null;
  synthesis: string;
  audit: string;
  repeat: number;
  delayMs: number;
  cases: number;
};

export type RunRecord = {
  type: "run";
  id: string;
  set?: string;
  category?: string;
  source?: string;
  pass: number;
  ms: number;
  outcome: Outcome;
  artifacts: { id: string; kind: string; chars: number }[];
  narrative: VerifiedNarrative | null;
};

export type Adjudication = Record<string, { verdict: "pass" | "fail"; note: string }>;

export type Verdict = "pass" | "fail" | "error" | "pending";
export type CaseStatus = "pass" | "fail" | "unstable" | "errored" | "pending";

export const runKey = (run: Pick<RunRecord, "id" | "pass">) => `${run.id}#${run.pass}`;

export function verdictOf(run: RunRecord, adjudication: Adjudication = {}): Verdict {
  if (run.outcome.kind === "review") return adjudication[runKey(run)]?.verdict ?? "pending";
  return run.outcome.kind;
}

export function caseStatus(verdicts: Verdict[]): CaseStatus {
  if (verdicts.includes("pending")) return "pending";
  const scored = verdicts.filter((v) => v !== "error");
  if (scored.length === 0) return "errored";
  if (scored.every((v) => v === "pass")) return "pass";
  if (scored.every((v) => v === "fail")) return "fail";
  return "unstable";
}

export function wilson(successes: number, total: number, z = 1.96): [number, number] {
  if (total === 0) return [0, 1];
  const p = successes / total;
  const z2 = z * z;
  const centre = p + z2 / (2 * total);
  const margin = z * Math.sqrt((p * (1 - p)) / total + z2 / (4 * total * total));
  const scale = 1 + z2 / total;
  return [Math.max(0, (centre - margin) / scale), Math.min(1, (centre + margin) / scale)];
}

export type CaseRow = {
  id: string;
  set: string;
  category: string;
  source: string;
  verdicts: Verdict[];
  status: CaseStatus;
  scores: number[];
  manual: boolean;
  notes: string[];
};

export function caseRows(runs: RunRecord[], adjudication: Adjudication = {}): CaseRow[] {
  const byId = new Map<string, RunRecord[]>();
  for (const run of runs) byId.set(run.id, [...(byId.get(run.id) ?? []), run]);
  return [...byId.entries()].map(([id, group]) => {
    const ordered = [...group].sort((a, b) => a.pass - b.pass);
    const verdicts = ordered.map((r) => verdictOf(r, adjudication));
    const notes = ordered.flatMap((r) => {
      if (r.outcome.kind === "fail") return [r.outcome.fails.join("; ")];
      if (r.outcome.kind === "error") return [r.outcome.message];
      const ruling = adjudication[runKey(r)];
      return r.outcome.kind === "review" && ruling?.verdict === "fail" ? [ruling.note] : [];
    });
    return {
      id,
      set: ordered[0].set ?? "",
      category: ordered[0].category ?? "",
      source: ordered[0].source ?? "",
      verdicts,
      status: caseStatus(verdicts),
      scores: ordered.flatMap((r) => (r.narrative ? [r.narrative.confidence.score] : [])),
      manual: ordered.some((r) => r.outcome.kind === "review"),
      notes: [...new Set(notes)],
    };
  });
}

export type GroupRow = {
  name: string;
  cases: number;
  pass: number;
  unstable: number;
  fail: number;
  other: number;
  runsPassed: number;
  runsScored: number;
  runsErrored: number;
};

export function groupRows(rows: CaseRow[], key: (row: CaseRow) => string): GroupRow[] {
  const groups = new Map<string, CaseRow[]>();
  for (const row of rows) groups.set(key(row), [...(groups.get(key(row)) ?? []), row]);
  return [...groups.entries()].map(([name, members]) => {
    const verdicts = members.flatMap((m) => m.verdicts);
    const count = (status: CaseStatus) => members.filter((m) => m.status === status).length;
    return {
      name,
      cases: members.length,
      pass: count("pass"),
      unstable: count("unstable"),
      fail: count("fail"),
      other: count("errored") + count("pending"),
      runsPassed: verdicts.filter((v) => v === "pass").length,
      runsScored: verdicts.filter((v) => v === "pass" || v === "fail").length,
      runsErrored: verdicts.filter((v) => v === "error").length,
    };
  });
}

const pct = (value: number) => `${Math.round(value * 100)}%`;
const MARK: Record<Verdict, string> = { pass: "✓", fail: "✗", error: "!", pending: "?" };

function groupTable(title: string, groups: GroupRow[]): string {
  const total = (pick: (g: GroupRow) => number) => groups.reduce((sum, g) => sum + pick(g), 0);
  const line = (g: GroupRow) =>
    `| ${g.name} | ${g.cases} | ${g.pass} | ${g.unstable} | ${g.fail} | ${g.runsPassed}/${g.runsScored} | ${g.runsErrored} |`;
  const all: GroupRow = {
    name: "**All**",
    cases: total((g) => g.cases),
    pass: total((g) => g.pass),
    unstable: total((g) => g.unstable),
    fail: total((g) => g.fail),
    other: total((g) => g.other),
    runsPassed: total((g) => g.runsPassed),
    runsScored: total((g) => g.runsScored),
    runsErrored: total((g) => g.runsErrored),
  };
  return [
    `| ${title} | Cases | Passed every run | Unstable | Failed every run | Runs passed | Errored runs |`,
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...groups.map(line),
    line(all),
  ].join("\n");
}

export function renderReport(
  meta: MetaRecord | null,
  runs: RunRecord[],
  adjudication: Adjudication = {},
): string {
  const rows = caseRows(runs, adjudication);
  const stable = rows.filter((r) => r.status === "pass").length;
  const [low, high] = wilson(stable, rows.length);
  const header = meta
    ? `${meta.date.slice(0, 10)} · commit ${meta.commit ?? "unknown"} · synthesis \`${meta.synthesis}\` · audit \`${meta.audit}\` · ${meta.repeat} passes`
    : "";
  const caseLine = (r: CaseRow) =>
    `| \`${r.id}\` | ${r.set} | ${r.category} | ${r.source} | ${r.verdicts.map((v) => MARK[v]).join(" ")}${r.manual ? " (manual)" : ""} | ${r.scores.join(" · ")} | ${r.notes.join(" / ")} |`;
  return [
    header,
    "",
    groupTable(
      "Category",
      groupRows(rows, (r) => r.category),
    ),
    "",
    groupTable(
      "Source",
      groupRows(rows, (r) => r.source),
    ),
    "",
    groupTable(
      "Set",
      groupRows(rows, (r) => r.set),
    ),
    "",
    `${stable} of ${rows.length} cases passed every run. With ${rows.length} cases the 95% Wilson interval for that proportion is ${pct(low)}–${pct(high)}.`,
    "",
    "| Case | Set | Category | Source | Runs | Scores | Why it failed |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...rows.map(caseLine),
  ].join("\n");
}

export function parseRecords(text: string): { meta: MetaRecord | null; runs: RunRecord[] } {
  const records = text
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as MetaRecord | RunRecord);
  return {
    meta: records.find((r): r is MetaRecord => r.type === "meta") ?? null,
    runs: records.filter((r): r is RunRecord => r.type === "run"),
  };
}

function main() {
  const [resultsPath, adjudicationPath] = process.argv.slice(2);
  if (!resultsPath || !existsSync(resultsPath)) {
    console.error("usage: npm run eval:report -- eval/results/<run>.jsonl [adjudication.json]");
    process.exit(1);
  }
  const { meta, runs } = parseRecords(readFileSync(resultsPath, "utf8"));
  const adjudication: Adjudication =
    adjudicationPath && existsSync(adjudicationPath)
      ? JSON.parse(readFileSync(adjudicationPath, "utf8"))
      : {};
  console.log(renderReport(meta, runs, adjudication));
}

if (process.argv[1]?.endsWith("eval-report.ts")) main();
