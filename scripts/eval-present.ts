import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { parseControls, parseReplay } from "./eval-audit-claims";
import type { CaseFacts } from "./eval-link-states";
import { type KeptOrigins, originIndex } from "./eval-passage-origin";
import {
  type AnswerRow,
  type Manual,
  type OriginTables,
  type Reread,
  NOT_PERTINENCE,
  answerLines,
  answerPassages,
  answerRows,
  answerTables,
  controlLines,
  controlPassages,
  controlRows,
  controlTables,
  originLines,
  originTables,
} from "./eval-presentation";
import { type Review, parseRecords } from "./eval-report";

const RESULTS = "eval/results";
const CURRENT = "2026-10-12-line-attribution.jsonl";
const REREAD = `${RESULTS}/2026-10-12-ng-http-411.reread.json`;
const ORIGINS = `${RESULTS}/2026-10-13-passage-origins.json`;

const json = <T>(path: string): T | null =>
  existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as T) : null;

export function keptRuns(): string[] {
  return readdirSync(RESULTS)
    .filter((name) => name.endsWith(".jsonl"))
    .filter(
      (name) => !readFileSync(`${RESULTS}/${name}`, "utf8").startsWith('{"type":"meta","kind"'),
    );
}

export function manualFor(name: string): Manual {
  const beside = (suffix: string) => `${RESULTS}/${name.replace(/\.jsonl$/, suffix)}`;
  const review = json<Review>(beside(".review.json"));
  const reading = json<{ unsupported?: Record<string, string> }>(beside(".reading.json"));
  const reread = json<Reread>(REREAD);
  return {
    ...(review ? { adjudication: review.verdicts } : {}),
    ...(reread ? { reread } : {}),
    ...(reading ? { flagged: new Set(Object.keys(reading.unsupported ?? {})) } : {}),
  };
}

export function project(factsFile: string, replayFile: string, originsFile?: string | null) {
  const kept = JSON.parse(readFileSync(factsFile, "utf8")) as { cases: CaseFacts[] };
  const facts = new Map(kept.cases.map((c) => [c.id, c]));
  const written = parseControls(readFileSync("eval/audit-controls.json", "utf8"));
  const judgements = parseReplay(readFileSync(replayFile, "utf8")).judgements;
  const controls = controlRows(written, judgements, facts);
  const files = keptRuns();
  const runs = new Map(
    files.map((name) => [name, parseRecords(readFileSync(`${RESULTS}/${name}`, "utf8")).runs]),
  );
  const answers: AnswerRow[] = files.flatMap((name) =>
    answerRows(name, runs.get(name) ?? [], facts, manualFor(name)),
  );
  const earlier = files.filter((name) => name !== CURRENT);
  const now = `The pipeline as it is on main (${CURRENT})`;
  const before = `The kept runs of the pipelines before it (${earlier.length} files)`;
  const origins = originsFile
    ? originIndex(JSON.parse(readFileSync(originsFile, "utf8")) as KeptOrigins)
    : null;
  const passages = origins
    ? files.flatMap((name) =>
        answerPassages(name, runs.get(name) ?? [], facts, origins, manualFor(name)),
      )
    : [];
  const traced: { controls: OriginTables; runs: Record<string, OriginTables> } | null = origins
    ? {
        controls: originTables(controlPassages(written, judgements, facts, origins)),
        runs: {
          [now]: originTables(passages.filter((row) => row.from === CURRENT)),
          [before]: originTables(passages.filter((row) => row.from !== CURRENT)),
        },
      }
    : null;
  return {
    files,
    controls,
    answers,
    tables: {
      controls: controlTables(controls),
      runs: {
        [now]: answerTables(answers.filter((row) => row.from === CURRENT)),
        [before]: answerTables(answers.filter((row) => row.from !== CURRENT)),
      },
      ...(traced ? { origins: traced } : {}),
    },
  };
}

function main() {
  const out = process.argv[2];
  const factsFile = process.argv[3] ?? `${RESULTS}/2026-10-12-link-signals.json`;
  const replayFile =
    process.argv[4] ?? `${RESULTS}/2026-10-12-patch-context-replay-one-question.jsonl`;
  const originsFile = process.argv[5] ?? (existsSync(ORIGINS) ? ORIGINS : null);
  if (!out) {
    console.error(
      "usage: npm run eval:present -- <out.json> [link facts.json] [kept replay.jsonl] [passage origins.json]",
    );
    process.exit(1);
  }
  const projected = project(factsFile, replayFile, originsFile);
  console.log(controlLines(projected.tables.controls).join("\n"));
  for (const [title, tables] of Object.entries(projected.tables.runs))
    console.log(answerLines(title, tables).join("\n"));
  const traced = projected.tables.origins;
  if (traced) {
    console.log(originLines("Written controls", traced.controls).join("\n"));
    for (const [title, tables] of Object.entries(traced.runs))
      console.log(originLines(title, tables).join("\n"));
    console.log(`\n${NOT_PERTINENCE}`);
  }
  writeFileSync(
    out,
    `${JSON.stringify({ date: new Date().toISOString(), facts: factsFile, replay: replayFile, ...(originsFile ? { origins: originsFile } : {}), ...projected }, null, 2)}\n`,
  );
}

if (process.argv[1]?.endsWith("eval-present.ts")) main();
