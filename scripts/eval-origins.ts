import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { collect, parseLocation } from "@understory/core/collect";
import { lineageOf } from "@understory/core/collect/lineage";
import type { Artifact } from "@understory/core/types";
import { parseReplay } from "./eval-audit-claims";
import type { Case, Gold } from "./eval-check";
import { crossTab } from "./eval-link-states";
import { owningCommitOf } from "./eval-link-signals";
import {
  type ChangeFact,
  type PassageOrigin,
  changesOf,
  passageOrigin,
  sitsIn,
} from "./eval-passage-origin";
import { keptRuns } from "./eval-present";
import { parseRecords } from "./eval-report";

const proc = process as NodeJS.Process & { loadEnvFile?: (path?: string) => void };
for (const file of [".env.local", ".env"]) if (existsSync(file)) proc.loadEnvFile?.(file);

const RESULTS = "eval/results";

const WHAT = [
  "Where each verified passage of the kept runs and of the kept control judgements sits in the",
  "record, and which change to the line that record belongs to. Read from the collected evidence,",
  "with no model. This is provenance only. It says where a sentence was written and for which",
  "change. It does not say that the sentence is the reason for the investigated line, that it is",
  "about the part of the change the line belongs to, or that what it describes was kept in the",
  "change as merged.",
].join(" ");

type Wanted = Map<string, Map<string, Set<string>>>;

function want(wanted: Wanted, id: string, source: string, quote: string) {
  const sources = wanted.get(id) ?? new Map<string, Set<string>>();
  sources.set(source, (sources.get(source) ?? new Set<string>()).add(quote));
  wanted.set(id, sources);
}

async function main() {
  const out = process.argv[2];
  const replayFile =
    process.argv[3] ?? `${RESULTS}/2026-10-12-patch-context-replay-one-question.jsonl`;
  if (!out) {
    console.error("usage: npm run eval:origins -- <out.json> [kept replay.jsonl]");
    process.exit(1);
  }
  const gold: Gold = JSON.parse(readFileSync("eval/gold.json", "utf8"));
  const files = keptRuns();
  const quoted: Wanted = new Map();
  const offered: Wanted = new Map();
  for (const name of files)
    for (const run of parseRecords(readFileSync(`${RESULTS}/${name}`, "utf8")).runs)
      for (const check of run.narrative?.entailment?.checks ?? [])
        if (check.quote) want(quoted, run.id, check.citation, check.quote);
  for (const j of parseReplay(readFileSync(replayFile, "utf8")).judgements)
    if (j.kind && j.quote) for (const source of j.citations) want(offered, j.id, source, j.quote);

  const cases: Array<{ id: string; changes: ChangeFact[] }> = [];
  const passages: PassageOrigin[] = [];
  for (const c of gold.cases as Case[]) {
    if (!quoted.has(c.id) && !offered.has(c.id)) continue;
    const ev = await collect({
      repoPath: c.repo ?? gold.repo,
      question: c.question,
      location: parseLocation(c.location),
    });
    const byId = new Map<string, Artifact>(ev.artifacts.map((a) => [a.id, a]));
    const commits = new Set(ev.artifacts.flatMap((a) => owningCommitOf(a, byId)?.id ?? []));
    const changes = changesOf(ev, commits.size > 1 ? await lineageOf(ev) : null);
    cases.push({ id: c.id, changes });
    const seen = new Set<string>();
    const keep = (source: string, quote: string, onlyIfLocated: boolean) => {
      const artifact = byId.get(source);
      const key = JSON.stringify([source, quote]);
      if (!artifact || seen.has(key)) return;
      const origin = passageOrigin(c.id, ev, artifact, quote, changes);
      if (onlyIfLocated && origin.parts.length === 0) return;
      seen.add(key);
      passages.push(origin);
    };
    for (const [source, quotes] of quoted.get(c.id) ?? [])
      for (const quote of quotes) keep(source, quote, false);
    for (const [source, quotes] of offered.get(c.id) ?? [])
      for (const quote of quotes) keep(source, quote, true);
  }

  writeFileSync(
    out,
    `${JSON.stringify({ date: new Date().toISOString(), what: WHAT, replay: replayFile, files, cases, passages }, null, 2)}\n`,
  );

  const show = (title: string, table: Record<string, Record<string, number>>) => {
    console.log(`\n${title}`);
    for (const [row, cells] of Object.entries(table))
      console.log(
        `  ${row}: ${Object.entries(cells)
          .sort((a, b) => b[1] - a[1])
          .map(([cell, n]) => `${n} ${cell}`)
          .join(" · ")}`,
      );
  };
  console.log(`${passages.length} verified passages in ${cases.length} cases`);
  show(
    "where they sit, by kind of source",
    crossTab(
      passages,
      (p) => p.kind,
      (p) => sitsIn(p.kind, p.parts),
    ),
  );
  show(
    "the change their record belongs to",
    crossTab(
      passages,
      (p) => p.kind,
      (p) => (p.change === null ? "no change" : p.last ? "the last change" : "an earlier change"),
    ),
  );
  console.log(`\n${WHAT}`);
}

void main();
