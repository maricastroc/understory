import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  type ChangedFile,
  MAP_BUDGET,
  changeMap,
  renderChangeMap,
} from "@understory/core/collect/change-map";
import { readAnswer } from "@understory/core/reading";
import type { Evidence } from "@understory/core/types";
import { parseControls, parseReplay } from "./eval-audit-claims";
import {
  EXPECTATIONS,
  type Expectation,
  type Item,
  filesOf,
  itemsOf,
  lineAt,
  shaOf,
} from "./eval-pertinence";
import {
  PERTINENCE_SYSTEM,
  type PertinenceInput,
  renderPertinence,
} from "./eval-pertinence-prompt";
import type { Snapshot } from "./eval-readings";

const EVIDENCE = "eval/results/2026-10-14-reading-evidence.json";
const REPLAY = "eval/results/2026-10-12-patch-context-replay-one-question.jsonl";

export function inputOf(
  item: Pick<Item, "change" | "claim" | "passages">,
  ev: Evidence,
  files: ChangedFile[],
  budget = MAP_BUDGET,
): PertinenceInput | null {
  const change = readAnswer(ev, null)?.changes.find((c) => c.id === item.change);
  const line = lineAt(ev, item.change);
  if (!change || !line) return null;
  const map = changeMap(files, line, budget);
  const kind = (source: string) =>
    ev.artifacts.find((a) => a.id === source)?.kind.replace("_", " ") ?? "source";
  return {
    line: {
      path: map.line.path,
      number: map.line.number,
      text: line.text,
      did: change.did ?? null,
      before: change.before ?? null,
    },
    sentence: item.claim,
    passages: item.passages.map((p) => ({
      source: p.source,
      kind: kind(p.source),
      parts: p.parts ?? [],
      text: p.text,
    })),
    change: { id: item.change, title: change.title, files: files.length },
    map: renderChangeMap(map),
  };
}

async function main() {
  const [dir, ...cases] = process.argv.slice(2);
  if (!dir || cases.length === 0) {
    console.error("usage: npx tsx scripts/eval-pertinence-render.ts <dir> <case> [case…]");
    process.exit(1);
  }
  process.loadEnvFile?.(".env.local");
  mkdirSync(dir, { recursive: true });
  const snapshot = JSON.parse(readFileSync(EVIDENCE, "utf8")) as Snapshot;
  const evidence = new Map(snapshot.cases.map((c) => [c.id, c.evidence as Evidence]));
  const expectations = (
    JSON.parse(readFileSync(EXPECTATIONS, "utf8")) as { controls: Expectation[] }
  ).controls;
  const items = itemsOf(
    evidence,
    parseControls(readFileSync("eval/audit-controls.json", "utf8")),
    parseReplay(readFileSync(REPLAY, "utf8")).judgements,
    [],
    expectations,
  ).filter((i) => cases.includes(i.id));
  writeFileSync(`${dir}/system.txt`, `${PERTINENCE_SYSTEM}\n`);
  const seen = new Set<string>();
  for (const item of items) {
    const passages = item.passages.map((p) => p.text).join(" | ");
    const key = `${item.id} | ${item.claim} | ${passages}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const ev = evidence.get(item.id)!;
    const { files } = await filesOf(ev, shaOf(ev, item.change)!);
    const n = [...seen].filter((k) => k.startsWith(`${item.id} |`)).length;
    for (const budget of [MAP_BUDGET, 8_000]) {
      const input = inputOf(item, ev, files, budget);
      if (!input) continue;
      const name = `${item.id}-${n}-${budget}.txt`;
      writeFileSync(`${dir}/${name}`, `${renderPertinence(input)}\n`);
      console.log(`${name}: ${item.group} · ${item.claim.slice(0, 70)}`);
    }
  }
}

if (process.argv[1]?.endsWith("eval-pertinence-render.ts")) void main();
