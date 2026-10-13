import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { parseControls, parseReplay } from "./eval-audit-claims";
import type { CaseFacts } from "./eval-link-states";
import {
  type AnswerRow,
  type Manual,
  type Reread,
  answerLines,
  answerRows,
  answerTables,
  controlLines,
  controlRows,
  controlTables,
} from "./eval-presentation";
import { type Review, parseRecords } from "./eval-report";

const RESULTS = "eval/results";
const CURRENT = "2026-10-12-line-attribution.jsonl";
const REREAD = `${RESULTS}/2026-10-12-ng-http-411.reread.json`;

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

export function project(factsFile: string, replayFile: string) {
  const kept = JSON.parse(readFileSync(factsFile, "utf8")) as { cases: CaseFacts[] };
  const facts = new Map(kept.cases.map((c) => [c.id, c]));
  const controls = controlRows(
    parseControls(readFileSync("eval/audit-controls.json", "utf8")),
    parseReplay(readFileSync(replayFile, "utf8")).judgements,
    facts,
  );
  const files = keptRuns();
  const answers: AnswerRow[] = files.flatMap((name) =>
    answerRows(
      name,
      parseRecords(readFileSync(`${RESULTS}/${name}`, "utf8")).runs,
      facts,
      manualFor(name),
    ),
  );
  const earlier = files.filter((name) => name !== CURRENT);
  return {
    files,
    controls,
    answers,
    tables: {
      controls: controlTables(controls),
      runs: {
        [`The pipeline as it is on main (${CURRENT})`]: answerTables(
          answers.filter((row) => row.from === CURRENT),
        ),
        [`The kept runs of the pipelines before it (${earlier.length} files)`]: answerTables(
          answers.filter((row) => row.from !== CURRENT),
        ),
      },
    },
  };
}

function main() {
  const out = process.argv[2];
  const factsFile = process.argv[3] ?? `${RESULTS}/2026-10-12-link-signals.json`;
  const replayFile =
    process.argv[4] ?? `${RESULTS}/2026-10-12-patch-context-replay-one-question.jsonl`;
  if (!out) {
    console.error(
      "usage: npm run eval:present -- <out.json> [link facts.json] [kept replay.jsonl]",
    );
    process.exit(1);
  }
  const projected = project(factsFile, replayFile);
  console.log(controlLines(projected.tables.controls).join("\n"));
  for (const [title, tables] of Object.entries(projected.tables.runs))
    console.log(answerLines(title, tables).join("\n"));
  writeFileSync(
    out,
    `${JSON.stringify({ date: new Date().toISOString(), facts: factsFile, replay: replayFile, ...projected }, null, 2)}\n`,
  );
}

if (process.argv[1]?.endsWith("eval-present.ts")) main();
