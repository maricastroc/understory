import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { collect, parseLocation } from "@understory/core/collect";
import { lineageOf } from "@understory/core/collect/lineage";
import { sourcePassages } from "@understory/core/quote";
import { readAnswer } from "@understory/core/reading";
import type {
  Artifact,
  EntailmentStatus,
  Evidence,
  Explanation,
  Reading,
  VerifiedNarrative,
} from "@understory/core/types";
import { type Judgement, type WrittenClaim, parseControls, parseReplay } from "./eval-audit-claims";
import type { Case, Gold } from "./eval-check";
import { crossTab } from "./eval-link-states";
import { type Group, groupOf, verdictFor } from "./eval-presentation";
import { keptRuns, manualFor } from "./eval-present";
import { type RunRecord, type Verdict, parseRecords } from "./eval-report";

const RESULTS = "eval/results";
const CURRENT = "2026-10-12-line-attribution.jsonl";
const EVIDENCE = `${RESULTS}/2026-10-14-reading-evidence.json`;
const REPLAY = `${RESULTS}/2026-10-12-patch-context-replay-one-question.jsonl`;
const PRESENTED = `${RESULTS}/2026-10-12-presentation.json`;

export const WHAT = [
  "The kept runs and the kept judgements of the written controls, read by the core's readAnswer",
  "on the evidence collection gives today, with no model. Before: the writer's sentence kept only",
  "where a source is linked directly to the line. Now: also kept as an inference when the record",
  "of a change to the line states the reason and nothing in the structure rules it out. An",
  "inference is not a proven reason for the line, and where a passage sits is not why it is",
  "the line's.",
].join(" ");

export type Snapshot = { cases: Array<{ id: string; evidence: Evidence }> };

export type Outcome =
  | "documented for the line"
  | "inferred for the last change"
  | "inferred for an earlier change"
  | "context only"
  | "not established";

export function outcomeOf(reading: Reading, claim: number): Outcome {
  for (const change of reading.changes)
    for (const reason of change.reasons)
      if (reason.claim === claim && reason.standing)
        return reason.standing === "documented for the line"
          ? "documented for the line"
          : change.last
            ? "inferred for the last change"
            : "inferred for an earlier change";
  const read = reading.claims.find((c) => c.claim === claim);
  return read?.quality === "stated by a cited source" ? "context only" : "not established";
}

export function carriedBy(reading: Reading, claim: number): string | null {
  for (const change of reading.changes)
    if (change.reasons.some((reason) => reason.claim === claim && reason.standing))
      return change.id;
  return null;
}

export function controlNarrative(
  control: WrittenClaim,
  judgement: Judgement,
  ev: Evidence,
): VerifiedNarrative {
  const byId = new Map<string, Artifact>(ev.artifacts.map((a) => [a.id, a]));
  const status = judgement.status as EntailmentStatus;
  let placed = false;
  const checks = control.citations.map((citation) => {
    const body = byId.get(citation)?.body;
    const found = !placed && judgement.quote && body ? sourcePassages(body, judgement.quote) : null;
    if (found) placed = true;
    return { citation, claim: 0, status, quote: found ? found[0] : null, reason: "" };
  });
  return {
    answer: "",
    answerable: true,
    recorded: true,
    citations: control.citations,
    claims: [{ text: control.text, citations: control.citations, grounded: true }],
    grounded: true,
    unknownCitations: [],
    ungroundedClaims: 0,
    confidence: { score: 0, level: "low", primarySources: 0, corroborating: 0, contradicting: 0 },
    entailment: {
      checked: true,
      checks,
      supported: status === "supported" ? 1 : 0,
      misattributed: status === "unsupported" ? 1 : 0,
    },
  };
}

export type ControlRow = {
  id: string;
  kind: string;
  group: Group;
  pass: number;
  status: EntailmentStatus;
  before: boolean;
  now: Outcome;
  change: string | null;
};

export function controlRows(
  controls: WrittenClaim[],
  judgements: Judgement[],
  evidence: Map<string, Evidence>,
): ControlRow[] {
  return controls.flatMap((control) =>
    judgements
      .filter((j) => j.kind && j.id === control.id && j.claim === control.text && j.status)
      .flatMap((j) => {
        const ev = evidence.get(control.id);
        const reading = ev ? readAnswer(ev, controlNarrative(control, j, ev)) : null;
        if (!reading) return [];
        const now = outcomeOf(reading, 0);
        return [
          {
            id: control.id,
            kind: control.kind,
            group: groupOf(control),
            pass: j.replay,
            status: j.status as EntailmentStatus,
            before: now === "documented for the line",
            now,
            change: carriedBy(reading, 0),
          },
        ];
      }),
  );
}

export type Lead = Explanation | "abstained" | "out of scope" | "no answer";

export type RunRow = {
  from: string;
  id: string;
  group: string;
  pass: number;
  verdict: Verdict;
  before: Lead;
  now: Lead;
  claims: Outcome[];
  spans: number;
  missing: number;
};

export function runRow(
  from: string,
  run: RunRecord,
  ev: Evidence | undefined,
  verdict: Verdict,
): RunRow {
  const group = `${run.category}, ${run.source === "synthetic" ? "synthetic" : "real lines"}`;
  const base = { from, id: run.id, group, pass: run.pass, verdict };
  const told = run.narrative;
  const empty: Lead = !told
    ? "no answer"
    : told.answerable === false
      ? "out of scope"
      : (told.claims ?? []).length === 0
        ? "abstained"
        : "not identified";
  const reading = ev && told ? readAnswer(ev, told) : null;
  if (!reading || empty !== "not identified")
    return { ...base, before: empty, now: empty, claims: [], spans: 0, missing: 0 };
  const claims = told!.claims.map((_, at) => outcomeOf(reading, at));
  const known = new Set(ev!.artifacts.map((a) => a.id));
  const checks = told!.entailment?.checks ?? [];
  const spans = told!.claims.filter((_, at) => {
    const changes = new Set(
      reading.changes
        .filter((change) => change.reasons.some((reason) => reason.claim === at))
        .map((change) => change.id),
    );
    return changes.size > 1;
  }).length;
  return {
    ...base,
    before: claims.includes("documented for the line")
      ? "documented for the line"
      : "not identified",
    now: reading.explanation,
    claims,
    spans,
    missing: checks.filter((check) => !known.has(check.citation)).length,
  };
}

const presents = (lead: Lead) => lead === "documented for the line" || lead === "inferred";

function count<T>(rows: T[], keyOf: (row: T) => string): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const row of rows) totals[keyOf(row)] = (totals[keyOf(row)] ?? 0) + 1;
  return totals;
}

export function controlTables(rows: ControlRow[]) {
  const sentence = (row: ControlRow) =>
    row.now === "documented for the line" ||
    row.now === "inferred for the last change" ||
    row.now === "inferred for an earlier change";
  return {
    judgements: rows.length,
    total: count(rows, (row) => row.group),
    before: count(
      rows.filter((row) => row.before),
      (row) => row.group,
    ),
    now: count(rows.filter(sentence), (row) => row.group),
    outcome: crossTab(
      rows,
      (row) => row.group,
      (row) => row.now,
    ),
    byKind: crossTab(
      rows,
      (row) => row.kind,
      (row) => row.now,
    ),
    borrowedAsAnInference: count(
      rows.filter((row) => row.group === "borrowed" && row.now.startsWith("inferred")),
      (row) => row.id,
    ),
    trueRecovered: count(
      rows.filter((row) => row.group === "true" && !row.before && sentence(row)),
      (row) => row.id,
    ),
    acrossChanges: crossTab(
      rows.filter((row) => /another change in the line|earlier version/.test(row.kind)),
      (row) => `${row.group}, ${row.kind}`,
      (row) => (row.change ? `${row.now} (${row.change})` : row.now),
    ),
  };
}

export function runTables(rows: RunRow[]) {
  const group = (row: RunRow) => row.group;
  const accepted = rows.filter((row) => row.verdict === "pass");
  const failed = rows.filter((row) => row.verdict === "fail");
  return {
    runs: rows.length,
    total: count(rows, group),
    now: crossTab(rows, group, (row) => row.now),
    before: count(
      rows.filter((row) => presents(row.before)),
      group,
    ),
    after: count(
      rows.filter((row) => presents(row.now)),
      group,
    ),
    accepted: count(accepted, group),
    acceptedBefore: count(
      accepted.filter((row) => presents(row.before)),
      group,
    ),
    acceptedAfter: count(
      accepted.filter((row) => presents(row.now)),
      group,
    ),
    failedNow: crossTab(failed, group, (row) => row.now),
    claims: crossTab(
      rows.flatMap((row) => row.claims.map((outcome) => ({ group: row.group, outcome }))),
      (row) => row.group,
      (row) => row.outcome,
    ),
    spanningClaims: rows.reduce((n, row) => n + row.spans, 0),
    sourcesNotCollectedToday: rows.reduce((n, row) => n + row.missing, 0),
  };
}

export function documentedAgainst(rows: RunRow[], presented: Array<Record<string, unknown>>) {
  const kept = new Map(presented.map((a) => [`${a.from}|${a.id}|${a.pass}`, a.lead]));
  const differ = rows.filter(
    (row) =>
      (row.now === "documented for the line") !==
      (kept.get(`${row.from}|${row.id}|${row.pass}`) === "documented for the line"),
  );
  return {
    documentedNow: rows.filter((row) => row.now === "documented for the line").length,
    documentedInTheKeptProjection: rows.filter(
      (row) => kept.get(`${row.from}|${row.id}|${row.pass}`) === "documented for the line",
    ).length,
    differ: differ.map((row) => `${row.from}#${row.id}#${row.pass}`),
  };
}

export function compare(snapshot: Snapshot, replayFile = REPLAY, presentedFile = PRESENTED) {
  const evidence = new Map(snapshot.cases.map((c) => [c.id, c.evidence]));
  const controls = controlRows(
    parseControls(readFileSync("eval/audit-controls.json", "utf8")),
    parseReplay(readFileSync(replayFile, "utf8")).judgements,
    evidence,
  );
  const files = keptRuns();
  const runs = files.flatMap((name) => {
    const manual = manualFor(name);
    return parseRecords(readFileSync(`${RESULTS}/${name}`, "utf8")).runs.map((run) =>
      runRow(name, run, evidence.get(run.id), verdictFor(name, run, manual)),
    );
  });
  const presented = JSON.parse(readFileSync(presentedFile, "utf8")) as {
    answers: Array<Record<string, unknown>>;
  };
  return {
    files,
    controls,
    tables: {
      controls: controlTables(controls),
      runs: {
        [`The pipeline as it is on main (${CURRENT})`]: runTables(
          runs.filter((row) => row.from === CURRENT),
        ),
        [`The kept runs of the pipelines before it (${files.length - 1} files)`]: runTables(
          runs.filter((row) => row.from !== CURRENT),
        ),
      },
      documented: documentedAgainst(runs, presented.answers),
    },
  };
}

const withoutEmails = (ev: Evidence): Evidence => ({
  ...ev,
  artifacts: ev.artifacts.map((a) => (a.author ? { ...a, author: { name: a.author.name } } : a)),
});

async function snapshotCases(out: string) {
  const proc = process as NodeJS.Process & { loadEnvFile?: (path?: string) => void };
  for (const file of [".env.local", ".env"]) if (existsSync(file)) proc.loadEnvFile?.(file);
  const gold: Gold = JSON.parse(readFileSync("eval/gold.json", "utf8"));
  const cases: Snapshot["cases"] = [];
  for (const c of gold.cases as Case[]) {
    const ev = await collect({
      repoPath: c.repo ?? gold.repo,
      question: c.question,
      location: parseLocation(c.location),
    });
    const commits = ev.artifacts.filter((a) => a.kind === "commit").length;
    const lineage = commits > 1 ? await lineageOf(ev) : null;
    cases.push({ id: c.id, evidence: withoutEmails(lineage ? { ...ev, lineage } : ev) });
    console.log(`${c.id}: ${ev.artifacts.length} sources${lineage ? ", walked" : ""}`);
  }
  writeFileSync(
    out,
    `${JSON.stringify({ date: new Date().toISOString(), what: "The evidence collection gives today for each case of the gold set, read again with no model, with the walk back through the line's history where more than one commit was collected. Authors' e-mail addresses are left out.", cases }, null, 2)}\n`,
  );
}

const share = (part: Record<string, number>, all: Record<string, number>) =>
  Object.entries(all)
    .map(([group, n]) => `${group} ${part[group] ?? 0} of ${n}`)
    .join(" · ");

function show(title: string, table: Record<string, Record<string, number>>) {
  console.log(`\n${title}`);
  for (const [row, cells] of Object.entries(table))
    console.log(
      `  ${row}: ${Object.entries(cells)
        .sort((a, b) => b[1] - a[1])
        .map(([cell, n]) => `${n} ${cell}`)
        .join(" · ")}`,
    );
}

function main() {
  if (process.argv[2] === "collect") {
    const out = process.argv[3];
    if (!out) {
      console.error("usage: npm run eval:readings -- collect <evidence.json>");
      process.exit(1);
    }
    return snapshotCases(out);
  }
  const out = process.argv[2];
  const evidenceFile = process.argv[3] ?? EVIDENCE;
  if (!out) {
    console.error("usage: npm run eval:readings -- <out.json> [evidence.json]");
    process.exit(1);
  }
  const compared = compare(JSON.parse(readFileSync(evidenceFile, "utf8")) as Snapshot);
  const c = compared.tables.controls;
  console.log(`Written controls, ${c.judgements} kept judgements`);
  console.log(`  a sentence before: ${share(c.before, c.total)}`);
  console.log(`  a sentence now:    ${share(c.now, c.total)}`);
  show("what each would be presented as now", c.outcome);
  console.log(
    `  borrowed reasons presented as an inference: ${JSON.stringify(c.borrowedAsAnInference)}`,
  );
  console.log(
    `  true claims given a sentence they did not have: ${JSON.stringify(c.trueRecovered)}`,
  );
  show("claims about more than one change in the line's history", c.acrossChanges);
  show("by kind of control", c.byKind);
  for (const [title, t] of Object.entries(compared.tables.runs)) {
    console.log(`\n\n${title}: ${t.runs} runs`);
    console.log(`  runs given a sentence before: ${share(t.before, t.total)}`);
    console.log(`  runs given a sentence now:    ${share(t.after, t.total)}`);
    console.log(
      `  of the runs whose kept verdict is a pass, before: ${share(t.acceptedBefore, t.accepted)}`,
    );
    console.log(
      `  of the runs whose kept verdict is a pass, now:    ${share(t.acceptedAfter, t.accepted)}`,
    );
    show("what leads each answer now", t.now);
    show("runs whose kept verdict is a fail, by what leads them now", t.failedNow);
    show("claims, by what each would be presented as now", t.claims);
    console.log(`  claims with passages under more than one change: ${t.spanningClaims}`);
    console.log(`  cited sources that collection no longer returns: ${t.sourcesNotCollectedToday}`);
  }
  const d = compared.tables.documented;
  console.log(
    `\nDocumented for the line: ${d.documentedNow} runs now, ${d.documentedInTheKeptProjection} in the kept projection; ${d.differ.length} differ${d.differ.length ? `: ${d.differ.join(", ")}` : ""}.`,
  );
  console.log(`\n${WHAT}`);
  writeFileSync(
    out,
    `${JSON.stringify({ date: new Date().toISOString(), what: WHAT, evidence: evidenceFile, replay: REPLAY, ...compared }, null, 2)}\n`,
  );
}

if (process.argv[1]?.endsWith("eval-readings.ts")) void main();
