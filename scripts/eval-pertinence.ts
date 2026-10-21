import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import {
  type ChangeMap,
  type ChangedFile,
  MAP_BUDGET,
  changeMap,
  githubChangedFiles,
  hunksOf,
  localChangedFiles,
  renderChangeMap,
} from "@understory/core/collect/change-map";
import { parseGitHubRepo } from "@understory/core/collect/github";
import { runWithTokens } from "@understory/core/collect/token-context";
import { readAnswer } from "@understory/core/reading";
import type { Evidence, Passage, Reading, VerifiedNarrative } from "@understory/core/types";
import { type WrittenClaim, parseControls, parseReplay } from "./eval-audit-claims";
import { groupOf, verdictFor } from "./eval-presentation";
import { keptRuns, manualFor } from "./eval-present";
import { type Snapshot, controlNarrative, outcomeOf } from "./eval-readings";
import { parseRecords } from "./eval-report";

const RESULTS = "eval/results";
const EVIDENCE = `${RESULTS}/2026-10-14-reading-evidence.json`;
const REPLAY = `${RESULTS}/2026-10-12-patch-context-replay-one-question.jsonl`;
const CURRENT = "2026-10-12-line-attribution.jsonl";
export const EXPECTATIONS = "eval/pertinence-expectations.json";
export const BUDGETS = [2_000, 4_000, 8_000, 16_000, 32_000, Number.POSITIVE_INFINITY];

export const WHAT = [
  "What a test of pertinence would be shown for each sentence the core presents today as a likely",
  "explanation, and what the cap on its size would cut. For each change such a sentence sits under,",
  "every file the change touched and each hunk, with the hunk that changed the investigated line",
  "marked and kept whole, and the changed rows of the others spread across them within a budget.",
  "Read from the commits, with no model; nothing here is judged. Where a borrowed reason belongs is",
  "read from the expectations written before any model was asked, and checked against what each",
  "budget keeps.",
].join(" ");

export type Belongs =
  | "the line's part"
  | "another part of the same file"
  | "another file"
  | "not in the change"
  | "another change";

export type Expectation = {
  id: string;
  text: string;
  belongs: Belongs;
  where: { path: string; row: string } | { commit: string } | null;
  why: string;
};

export type Answer =
  | "the line's part"
  | "another part of the same file"
  | "another file"
  | "not in the change"
  | "insufficient evidence"
  | "indeterminate";

export type Item = {
  key: string;
  set: "controls" | "current run" | "earlier runs";
  id: string;
  group: string;
  change: string;
  last: boolean;
  claim: string;
  passages: Array<Pick<Passage, "source" | "text" | "parts">>;
  belongs: Belongs | null;
};

export type ChangeRecord = {
  id: string;
  change: string;
  last: boolean;
  sha: string;
  read: "GitHub API" | "git";
  line: { path: string; text: string };
  full: {
    files: number;
    hunks: number;
    changedRows: number;
    patchChars: number;
    notReturned: number;
  };
  budgets: Record<
    string,
    Pick<ChangeMap, "chars" | "complete" | "cut"> & { found: boolean; holds: string[] }
  >;
  map: Pick<ChangeMap, "budget" | "chars" | "complete" | "cut" | "line"> & { text: string };
};

const presented = (reading: Reading, claim: number) =>
  reading.changes.flatMap((change) =>
    change.reasons
      .filter((r) => r.claim === claim && r.standing === "inferred")
      .map((r) => ({ change, reason: r })),
  );

export function itemsOf(
  evidence: Map<string, Evidence>,
  controls: WrittenClaim[],
  judgements: ReturnType<typeof parseReplay>["judgements"],
  runs: Array<{
    file: string;
    runs: ReturnType<typeof parseRecords>["runs"];
    verdict: (r: ReturnType<typeof parseRecords>["runs"][number]) => string;
  }>,
  expectations: Expectation[],
): Item[] {
  const items: Item[] = [];
  const add = (
    key: string,
    set: Item["set"],
    id: string,
    group: string,
    claim: string,
    reading: Reading,
    at: number,
    belongs: Belongs | null,
  ) => {
    for (const { change, reason } of presented(reading, at))
      items.push({
        key,
        set,
        id,
        group,
        change: change.id,
        last: change.last,
        claim,
        passages: reason.passages.map((p) => ({
          source: p.source,
          text: p.text,
          parts: p.parts ?? [],
        })),
        belongs,
      });
  };
  controls.forEach((control, index) => {
    const expected = expectations.find((e) => e.id === control.id && e.text === control.text);
    const group = groupOf(control);
    for (const j of judgements.filter(
      (j) => j.kind && j.id === control.id && j.claim === control.text && j.status,
    )) {
      const ev = evidence.get(control.id);
      const reading = ev ? readAnswer(ev, controlNarrative(control, j, ev)) : null;
      if (!reading) continue;
      add(
        `control:${index}:${j.replay}`,
        "controls",
        control.id,
        group,
        control.text,
        reading,
        0,
        expected?.belongs ?? (group === "true" ? "the line's part" : null),
      );
    }
  });
  for (const { file, runs: kept, verdict } of runs)
    for (const run of kept) {
      const ev = evidence.get(run.id);
      const told = run.narrative as VerifiedNarrative | null;
      if (!ev || !told || !(told.claims ?? []).length) continue;
      const reading = readAnswer(ev, told);
      if (!reading) continue;
      told.claims.forEach((claim, at) => {
        if (!outcomeOf(reading, at).startsWith("inferred")) return;
        add(
          `run:${file}:${run.id}:${run.pass}:${at}`,
          file === CURRENT ? "current run" : "earlier runs",
          run.id,
          verdict(run),
          claim.text,
          reading,
          at,
          null,
        );
      });
    }
  return items;
}

export function lineAt(ev: Evidence, change: string): { path: string; text: string } | null {
  const reading = readAnswer(ev, null);
  if (!reading || !ev.code || !ev.location) return null;
  const newest = [...reading.changes].sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
  );
  const at = newest.findIndex((c) => c.id === change);
  if (at < 0) return null;
  const text =
    at === 0
      ? ev.code.lines[ev.location.startLine - ev.code.startLine]
      : (newest[at - 1].before ?? null);
  return text === null || text === undefined ? null : { path: ev.location.file, text };
}

export function shaOf(ev: Evidence, change: string): string | null {
  const own = ev.artifacts.find((a) => a.id === change)?.meta?.sha;
  if (typeof own === "string") return own;
  const short = change.replace(/^commit:/, "");
  return ev.lineage?.entries.find((e) => e.sha.startsWith(short))?.sha ?? (short || null);
}

export function fullOf(files: ChangedFile[]): ChangeRecord["full"] {
  const hunks = files.flatMap((f) => hunksOf(f.patch ?? ""));
  return {
    files: files.length,
    hunks: hunks.length,
    changedRows: hunks.reduce(
      (n, h) => n + h.rows.filter((r) => r.startsWith("+") || r.startsWith("-")).length,
      0,
    ),
    patchChars: files.reduce((n, f) => n + (f.patch?.length ?? 0), 0),
    notReturned: files.filter((f) => f.patch === null).length,
  };
}

export function holds(map: ChangeMap, where: { path: string; row: string }): boolean {
  const wanted = where.row.trim();
  return map.files.some(
    (f) =>
      f.path === where.path &&
      f.hunks.some((h) =>
        h.rows.some((r) => /^[+-]/.test(r) && r.slice(1).trim().includes(wanted)),
      ),
  );
}

export function contextOf(item: Item, record: ChangeRecord): string {
  return [
    `Sentence: ${item.claim}`,
    ...item.passages.map(
      (p) =>
        `Passage [${p.source}${p.parts?.length ? ` · ${p.parts.join(" + ")}` : ""}]: “${p.text}”`,
    ),
    `The line: ${record.line.path} · ${record.line.text.trim()}`,
    `The change: ${record.change} · ${record.full.files} ${record.full.files === 1 ? "file" : "files"}`,
    record.map.text,
  ].join("\n");
}

export const budgetKey = (b: number) => (Number.isFinite(b) ? String(b) : "all");

export const expectationKey = (e: Pick<Expectation, "id" | "text">) => `${e.id} · ${e.text}`;

const quantile = (xs: number[], q: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.ceil(q * s.length) - 1)] : null;
};

function count<T>(rows: T[], keyOf: (row: T) => string): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const row of rows) totals[keyOf(row)] = (totals[keyOf(row)] ?? 0) + 1;
  return totals;
}

export function analyse(items: Item[], records: ChangeRecord[], expectations: Expectation[]) {
  const byChange = new Map(records.map((r) => [`${r.id}|${r.change}`, r]));
  const recordOf = (item: Item) => byChange.get(`${item.id}|${item.change}`);
  const covered = items.filter((i) => recordOf(i));
  const sizes = covered.map((i) => contextOf(i, recordOf(i)!).length);
  const located = expectations.filter(
    (e): e is Expectation & { where: { path: string; row: string } } =>
      !!e.where && "path" in e.where,
  );
  return {
    items: {
      total: items.length,
      bySet: count(
        items,
        (i) => `${i.set} · ${i.group} · ${i.last ? "last change" : "earlier change"}`,
      ),
      withoutAChange: items.filter((i) => !recordOf(i)).map((i) => i.key),
    },
    changes: {
      total: records.length,
      lineNotFound: records.filter((r) => !r.map.line.found).map((r) => `${r.id} ${r.change}`),
      patchNotReturned: records
        .filter((r) => r.full.notReturned > 0)
        .map((r) => `${r.id} ${r.change}: ${r.full.notReturned} of ${r.full.files} files`),
      full: {
        files: {
          p50: quantile(
            records.map((r) => r.full.files),
            0.5,
          ),
          max: Math.max(...records.map((r) => r.full.files)),
        },
        patchChars: {
          p50: quantile(
            records.map((r) => r.full.patchChars),
            0.5,
          ),
          max: Math.max(...records.map((r) => r.full.patchChars)),
          total: records.reduce((n, r) => n + r.full.patchChars, 0),
        },
      },
    },
    budgets: Object.fromEntries(
      BUDGETS.map((b) => {
        const k = budgetKey(b);
        const elsewhere = (r: ChangeRecord) =>
          r.budgets[k].cut.files + r.budgets[k].cut.hunks + r.budgets[k].cut.rows > 0;
        const ownHunk = (r: ChangeRecord) => r.budgets[k].cut.lineHunkRows > 0;
        return [
          k,
          {
            changesCutElsewhere: records.filter(elsewhere).length,
            changesCutInTheLineHunk: records.filter(ownHunk).length,
            itemsOnAChangeCutElsewhere: covered.filter((i) => elsewhere(recordOf(i)!)).length,
            itemsOnAChangeCutInTheLineHunk: covered.filter((i) => ownHunk(recordOf(i)!)).length,
            chars: {
              p50: quantile(
                records.map((r) => r.budgets[k].chars),
                0.5,
              ),
              max: Math.max(...records.map((r) => r.budgets[k].chars)),
            },
          },
        ];
      }),
    ),
    contextChars: {
      p50: quantile(sizes, 0.5),
      p95: quantile(sizes, 0.95),
      max: Math.max(0, ...sizes),
    },
    borrowedWhere: located.map((e) => {
      const record = records.find((r) => r.id === e.id && r.last);
      return {
        id: e.id,
        text: e.text,
        belongs: e.belongs,
        presented: items.filter((i) => i.set === "controls" && i.id === e.id && i.claim === e.text)
          .length,
        kept: Object.fromEntries(
          BUDGETS.map((b) => [
            budgetKey(b),
            record ? record.budgets[budgetKey(b)].holds.includes(expectationKey(e)) : null,
          ]),
        ),
      };
    }),
  };
}

export function tabulate(
  items: Item[],
  answers: Array<{
    key: string;
    change: string;
    replay: number;
    answer: Answer;
    truncated: boolean;
  }>,
) {
  const hiding: Record<string, Answer[]> = {
    "a located other part or not in the change": [
      "another part of the same file",
      "another file",
      "not in the change",
    ],
    "and insufficient evidence": [
      "another part of the same file",
      "another file",
      "not in the change",
      "insufficient evidence",
    ],
    "and indeterminate": [
      "another part of the same file",
      "another file",
      "not in the change",
      "insufficient evidence",
      "indeterminate",
    ],
  };
  const byKey = new Map(items.map((i) => [`${i.key}|${i.change}`, i]));
  const rows = answers.flatMap((a) => {
    const item = byKey.get(`${a.key}|${a.change}`);
    return item ? [{ ...a, item }] : [];
  });
  const cases = [
    ...new Set(rows.map((r) => `${r.item.set} · ${r.item.id} · ${r.item.group}`)),
  ].sort();
  return Object.fromEntries(
    cases.map((c) => {
      const mine = rows.filter((r) => `${r.item.set} · ${r.item.id} · ${r.item.group}` === c);
      return [
        c,
        {
          answers: mine.length,
          byAnswer: count(mine, (r) => r.answer),
          onATruncatedContext: count(
            mine.filter((r) => r.truncated),
            (r) => r.answer,
          ),
          stillShown: Object.fromEntries(
            Object.entries(hiding).map(([policy, hidden]) => [
              policy,
              mine.filter((r) => !hidden.includes(r.answer)).length,
            ]),
          ),
        },
      ];
    }),
  );
}

async function filesOf(
  ev: Evidence,
  sha: string,
): Promise<{ files: ChangedFile[]; read: ChangeRecord["read"] }> {
  if (existsSync(ev.repo.path))
    return { files: await localChangedFiles(ev.repo.path, sha), read: "git" };
  const gh = parseGitHubRepo(ev.repo.remoteUrl ?? ev.repo.path);
  if (!gh) throw new Error(`no provider for ${ev.repo.path}`);
  return {
    files: await runWithTokens({ github: process.env.GITHUB_TOKEN }, () =>
      githubChangedFiles(gh.owner, gh.repo, sha),
    ),
    read: "GitHub API",
  };
}

async function main() {
  const out = process.argv[2];
  if (!out) {
    console.error("usage: npm run eval:pertinence -- <out.json>");
    process.exit(1);
  }
  const proc = process as NodeJS.Process & { loadEnvFile?: (path?: string) => void };
  for (const file of [".env.local", ".env"]) if (existsSync(file)) proc.loadEnvFile?.(file);
  const snapshot = JSON.parse(readFileSync(EVIDENCE, "utf8")) as Snapshot;
  const evidence = new Map(snapshot.cases.map((c) => [c.id, c.evidence]));
  const expectations = (
    JSON.parse(readFileSync(EXPECTATIONS, "utf8")) as { controls: Expectation[] }
  ).controls;
  const items = itemsOf(
    evidence,
    parseControls(readFileSync("eval/audit-controls.json", "utf8")),
    parseReplay(readFileSync(REPLAY, "utf8")).judgements,
    keptRuns().map((file) => {
      const manual = manualFor(file);
      return {
        file,
        runs: parseRecords(readFileSync(`${RESULTS}/${file}`, "utf8")).runs,
        verdict: (run) => verdictFor(file, run, manual),
      };
    }),
    expectations,
  );
  const wanted = [...new Set(items.map((i) => `${i.id}|${i.change}`))];
  const records: ChangeRecord[] = [];
  for (const key of wanted) {
    const [id, change] = key.split("|");
    const ev = evidence.get(id)!;
    const line = lineAt(ev, change);
    const sha = shaOf(ev, change);
    if (!line || !sha) {
      console.log(`${id} ${change}: the line at that change could not be read`);
      continue;
    }
    const { files, read } = await filesOf(ev, sha);
    const mine = expectations.filter(
      (e): e is Expectation & { where: { path: string; row: string } } =>
        e.id === id && !!e.where && "path" in e.where,
    );
    const budgets: ChangeRecord["budgets"] = {};
    for (const b of BUDGETS) {
      const map = changeMap(files, line, b);
      budgets[budgetKey(b)] = {
        chars: map.chars,
        complete: map.complete,
        cut: map.cut,
        found: map.line.found,
        holds: mine.filter((e) => holds(map, e.where)).map(expectationKey),
      };
    }
    records.push({
      id,
      change,
      last: items.some((i) => i.id === id && i.change === change && i.last),
      sha,
      read,
      line,
      full: fullOf(files),
      budgets,
      map: (() => {
        const map = changeMap(files, line, MAP_BUDGET);
        return {
          budget: map.budget,
          chars: map.chars,
          complete: map.complete,
          cut: map.cut,
          line: map.line,
          text: renderChangeMap(map),
        };
      })(),
    });
    console.log(
      `${id} ${change}: ${files.length} files, ${budgets[budgetKey(MAP_BUDGET)].chars} chars at ${MAP_BUDGET}`,
    );
  }
  const analysis = analyse(items, records, expectations);
  console.log(JSON.stringify(analysis, null, 2));
  writeFileSync(
    out,
    `${JSON.stringify(
      {
        date: new Date().toISOString(),
        commit: execFileSync("git", ["rev-parse", "--short", "HEAD"]).toString().trim(),
        what: WHAT,
        evidence: EVIDENCE,
        replay: REPLAY,
        budget: MAP_BUDGET,
        analysis,
        items: items.map((i) => [i.key, i.change, i.group, i.belongs ?? ""].join(" | ")),
        changes: records,
      },
      null,
      2,
    )}\n`,
  );
}

if (process.argv[1]?.endsWith("eval-pertinence.ts")) void main();
