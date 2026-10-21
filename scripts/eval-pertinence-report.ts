import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { ChangedFile } from "@understory/core/collect/change-map";
import type { Evidence } from "@understory/core/types";
import {
  type ChangeRecord,
  EXPECTATIONS,
  type Expectation,
  filesOf,
  shaOf,
} from "./eval-pertinence";
import { type Match, type Settled, settle } from "./eval-pertinence-prompt";
import {
  type Call,
  type Input,
  type Stage,
  designInputs,
  plan,
  validationInputs,
} from "./eval-pertinence-replay";
import { POLICIES } from "./eval-pertinence-score";
import type { Snapshot } from "./eval-readings";

const RESULTS = "eval/results";
const EVIDENCE = `${RESULTS}/2026-10-14-reading-evidence.json`;
const CONTEXTS = `${RESULTS}/2026-10-21-pertinence-contexts.json`;

type Outcome = Settled | "invalid answer";

const HIDING = Object.entries(POLICIES);
const LOCATED: Outcome[] = ["the line's part", "another part of the same file", "another file"];

export type Unit = {
  stage: Stage;
  group: string;
  cluster: string;
  id: string;
  kind: Input["kind"];
  label: Expectation | null;
  model: string;
  variant: string;
  cut: boolean;
  answers: Outcome[];
  modal: Outcome | "split";
  agreement: number;
};

export const mapKey = (cluster: string, input: number, budget: number) =>
  `${cluster} | ${input} | ${budget}`;

export function settledOf(call: Call, maps: Map<string, string>, match: Match): Outcome {
  if (!call.answer) return "invalid answer";
  const map = maps.get(mapKey(call.cluster, call.input, call.budget));
  if (map === undefined)
    throw new Error(`no map for ${call.cluster} #${call.input} at ${call.budget}`);
  return settle(call.answer, map, match);
}

export function units(
  calls: Call[],
  maps: Map<string, string>,
  labels: Map<string, Expectation | null>,
  match: Match,
): Unit[] {
  const groups = new Map<string, Call[]>();
  for (const c of calls) {
    const key = `${c.cluster} || ${c.model} || ${c.variant}`;
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }
  return [...groups.values()].map((mine) => {
    const first = mine[0];
    const answers = mine.map((c) => settledOf(c, maps, match));
    const counts = new Map<Outcome, number>();
    for (const a of answers) counts.set(a, (counts.get(a) ?? 0) + 1);
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const modal = ranked.length === 1 || ranked[0][1] > ranked[1][1] ? ranked[0][0] : "split";
    return {
      stage: first.stage,
      group: first.group,
      cluster: first.cluster,
      id: first.id,
      kind: first.kind,
      label: labels.get(first.cluster) ?? null,
      model: first.model,
      variant: first.variant,
      cut: mine.some((c) => c.cut),
      answers,
      modal,
      agreement: ranked[0][1] / answers.length,
    };
  });
}

const hides = (modal: Unit["modal"], hidden: Settled[]) =>
  modal !== "split" && modal !== "invalid answer" && hidden.includes(modal);

export const mostHide = (u: Pick<Unit, "answers">, hidden: Settled[]) =>
  u.answers.filter((a) => a !== "invalid answer" && hidden.includes(a)).length * 2 >
  u.answers.length;

export function tables(all: Unit[]) {
  const sets = [...new Set(all.map((u) => `${u.stage} · ${u.group}`))].sort();
  const models = [...new Set(all.map((u) => u.model))].sort();
  const main = all.filter((u) => u.variant === "main");
  const block = (rows: Unit[]) => ({
    clusters: rows.length,
    hiddenUnder: Object.fromEntries(
      HIDING.map(([policy, hidden]) => [policy, rows.filter((u) => hides(u.modal, hidden)).length]),
    ),
    hiddenByMostCalls: Object.fromEntries(
      HIDING.map(([policy, hidden]) => [policy, rows.filter((u) => mostHide(u, hidden)).length]),
    ),
    rightCategory: rows.filter((u) => u.label && u.label.accept.includes(u.modal as string)).length,
    split: rows.filter((u) => u.modal === "split").length,
    stable: rows.filter((u) => u.agreement >= 2 / 3).length,
  });
  return {
    bySetModelKind: Object.fromEntries(
      sets.flatMap((set) =>
        models.flatMap((model) =>
          (["borrowed", "true", "interpretive"] as const).flatMap((kind) => {
            const rows = main.filter(
              (u) => `${u.stage} · ${u.group}` === set && u.model === model && u.kind === kind,
            );
            return rows.length
              ? [[`${set} · ${model.replace("openai/", "")} · ${kind}`, block(rows)]]
              : [];
          }),
        ),
      ),
    ),
    clusters: all
      .map((u) => ({
        set: `${u.stage} · ${u.group}`,
        id: u.id,
        kind: u.kind,
        sentence: u.cluster.split(" | ")[2]?.slice(0, 90) ?? u.cluster,
        model: u.model.replace("openai/", ""),
        variant: u.variant,
        cut: u.cut,
        modal: u.modal,
        hiddenByMostCalls: Object.fromEntries(
          HIDING.map(([policy, hidden]) => [policy, mostHide(u, hidden)]),
        ),
        agreement: Math.round(u.agreement * 100) / 100,
        answers: u.answers.join(", "),
        right:
          u.label && u.label.basis === "verifiable"
            ? u.label.accept.includes(u.modal as string)
            : null,
      }))
      .sort((a, b) =>
        (a.set + a.id + a.sentence + a.model + a.variant).localeCompare(
          b.set + b.id + b.sentence + b.model + b.variant,
        ),
      ),
  };
}

export function misreadings(
  calls: Call[],
  maps: Map<string, string>,
  labels: Map<string, Expectation | null>,
  match: Match,
) {
  return calls.flatMap((c) => {
    const label = labels.get(c.cluster);
    const settled = settledOf(c, maps, match);
    const located = LOCATED.includes(settled);
    const wrong =
      (located && label?.basis === "verifiable" && !label.accept.includes(settled)) ||
      settled === "row contradicts the verdict";
    return wrong
      ? [
          {
            set: `${c.stage} · ${c.group}`,
            id: c.id,
            kind: c.kind,
            model: c.model.replace("openai/", ""),
            variant: c.variant,
            replay: c.replay,
            settled,
            expected: label?.accept ?? [],
            verdict: c.answer?.verdict,
            row: c.answer?.row,
            reason: c.answer?.reason,
          },
        ]
      : [];
  });
}

export function costs(calls: Call[]) {
  const by = new Map<string, Call[]>();
  for (const c of calls)
    by.set(`${c.stage} · ${c.model}`, [...(by.get(`${c.stage} · ${c.model}`) ?? []), c]);
  const quantile = (xs: number[], q: number) => {
    const s = [...xs].sort((a, b) => a - b);
    return s[Math.min(s.length - 1, Math.ceil(q * s.length) - 1)];
  };
  return Object.fromEntries(
    [...by.entries()].map(([k, mine]) => [
      k,
      {
        calls: mine.length,
        invalid: mine.filter((c) => !c.answer).length,
        retried: mine.filter((c) => c.attempts > 1).length,
        cost: Math.round(mine.reduce((n, c) => n + c.cost, 0) * 10_000) / 10_000,
        tokensIn: mine.reduce((n, c) => n + c.tokens.input, 0),
        tokensOut: mine.reduce((n, c) => n + c.tokens.output, 0),
        ms: {
          p50: quantile(
            mine.map((c) => c.ms),
            0.5,
          ),
          p95: quantile(
            mine.map((c) => c.ms),
            0.95,
          ),
        },
      },
    ]),
  );
}

export const readCalls = (file: string) =>
  readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as Call | { type: string })
    .filter((r): r is Call => r.type === "call");

async function main() {
  const [out, ...files] = process.argv.slice(2);
  if (!out || files.length === 0) {
    console.error("usage: npx tsx scripts/eval-pertinence-report.ts <out.json> <replay.jsonl>…");
    process.exit(1);
  }
  for (const file of [".env.local", ".env"]) if (existsSync(file)) process.loadEnvFile?.(file);
  const snapshot = JSON.parse(readFileSync(EVIDENCE, "utf8")) as Snapshot;
  const evidence = new Map(snapshot.cases.map((c) => [c.id, c.evidence as Evidence]));
  const expectations = (
    JSON.parse(readFileSync(EXPECTATIONS, "utf8")) as { controls: Expectation[] }
  ).controls;
  const records = (JSON.parse(readFileSync(CONTEXTS, "utf8")) as { changes: ChangeRecord[] })
    .changes;
  const calls = files.flatMap(readCalls);
  const inputs = [
    ...designInputs(evidence, expectations, records),
    ...validationInputs(snapshot, expectations),
  ];
  const changed = new Map<string, ChangedFile[]>();
  for (const input of inputs) {
    const key = `${input.id}|${input.change}`;
    if (changed.has(key)) continue;
    const ev = evidence.get(input.id)!;
    changed.set(key, (await filesOf(ev, shaOf(ev, input.change)!)).files);
  }
  const planned = plan(
    inputs,
    (id) => evidence.get(id)!,
    (id, change) => changed.get(`${id}|${change}`)!,
    () => "source",
  );
  const maps = new Map(
    planned.map((p) => [mapKey(p.input.cluster, p.input.index, p.variant.budget), p.request.map]),
  );
  const labels = new Map(inputs.map((i) => [i.cluster, i.label]));
  const report = Object.fromEntries(
    (["exact", "spacing"] as const).map((match) => {
      const u = units(calls, maps, labels, match);
      return [match, { tables: tables(u), misreadings: misreadings(calls, maps, labels, match) }];
    }),
  );
  const result = { files, calls: calls.length, costs: costs(calls), ...report };
  writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`);
  console.log(
    JSON.stringify(
      {
        costs: result.costs,
        exact: report.exact.tables.bySetModelKind,
        spacing: report.spacing.tables.bySetModelKind,
      },
      null,
      2,
    ),
  );
}

if (process.argv[1]?.endsWith("eval-pertinence-report.ts")) void main();
