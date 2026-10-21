import type { ChangeRecord, Expectation, Item } from "./eval-pertinence";
import type { Settled } from "./eval-pertinence-prompt";

export type Cluster = {
  key: string;
  id: string;
  change: string;
  last: boolean;
  set: "controls" | "runs";
  label: Expectation | null;
  runs: Record<string, number>;
  inputs: Array<{ sentence: string; passages: Item["passages"] }>;
  cut: boolean;
};

export type Asked = { cluster: string; input: number; replay: number; settled: Settled };

export const POLICIES: Record<string, Settled[]> = {
  "hide a located other part, or a reason not in the change": [
    "another part of the same file",
    "another file",
    "not in the change",
  ],
  "also hide insufficient evidence": [
    "another part of the same file",
    "another file",
    "not in the change",
    "insufficient evidence",
  ],
  "also hide indeterminate": [
    "another part of the same file",
    "another file",
    "not in the change",
    "insufficient evidence",
    "indeterminate",
  ],
};

const passagesKey = (passages: Item["passages"]) =>
  passages
    .map((p) => `${p.source}:${p.text}`)
    .sort()
    .join(" || ");

export function clustersOf(
  items: Item[],
  records: ChangeRecord[],
  expectations: Expectation[],
  maxInputs = 3,
): Cluster[] {
  const byKey = new Map<string, Cluster>();
  for (const item of items) {
    const control = item.set === "controls";
    const key = control
      ? `control | ${item.id} | ${item.claim} | ${item.change}`
      : `run | ${item.id} | ${item.change} | ${passagesKey(item.passages)}`;
    const record = records.find((r) => r.id === item.id && r.change === item.change);
    const cluster = byKey.get(key) ?? {
      key,
      id: item.id,
      change: item.change,
      last: item.last,
      set: control ? "controls" : "runs",
      label: control
        ? (expectations.find((e) => e.id === item.id && e.text === item.claim) ?? null)
        : null,
      runs: {},
      inputs: [],
      cut: record ? !record.map.complete : true,
    };
    if (!control) cluster.runs[item.group] = (cluster.runs[item.group] ?? 0) + 1;
    const input = { sentence: item.claim, passages: item.passages };
    const same = (a: typeof input) =>
      a.sentence === input.sentence && passagesKey(a.passages) === passagesKey(input.passages);
    if (cluster.inputs.length < maxInputs && !cluster.inputs.some(same)) cluster.inputs.push(input);
    byKey.set(key, cluster);
  }
  return [...byKey.values()];
}

export type ClusterOutcome = {
  key: string;
  id: string;
  kind: string;
  basis: string;
  cut: boolean;
  answers: number;
  modal: Settled | "split";
  agreement: number;
  byAnswer: Partial<Record<Settled, number>>;
  right: boolean | null;
};

const kindOf = (c: Cluster) => {
  if (c.set === "controls")
    return c.label?.belongs === "the line's part"
      ? "true control"
      : c.label
        ? "borrowed control"
        : "control without a label";
  const verdicts = Object.keys(c.runs);
  if (verdicts.length === 1 && verdicts[0] === "pass") return "runs that passed";
  if (verdicts.length === 1 && verdicts[0] === "fail") return "runs that failed";
  return "runs mixed or pending";
};

export function outcomes(clusters: Cluster[], asked: Asked[]): ClusterOutcome[] {
  return clusters.map((c) => {
    const mine = asked.filter((a) => a.cluster === c.key);
    const byAnswer: Partial<Record<Settled, number>> = {};
    for (const a of mine) byAnswer[a.settled] = (byAnswer[a.settled] ?? 0) + 1;
    const ranked = Object.entries(byAnswer).sort((a, b) => b[1] - a[1]) as Array<[Settled, number]>;
    const modal =
      ranked.length && (ranked.length === 1 || ranked[0][1] > ranked[1][1])
        ? ranked[0][0]
        : "split";
    return {
      key: c.key,
      id: c.id,
      kind: kindOf(c),
      basis: c.label?.basis ?? "no label",
      cut: c.cut,
      answers: mine.length,
      modal,
      agreement: mine.length ? (ranked[0]?.[1] ?? 0) / mine.length : 0,
      byAnswer,
      right:
        c.label && c.label.basis === "verifiable" && modal !== "split"
          ? c.label.accept.includes(modal)
          : null,
    };
  });
}

export function score(results: ClusterOutcome[]) {
  const groups = [...new Set(results.map((r) => `${r.kind} · ${r.basis}`))].sort();
  const tally = (rows: ClusterOutcome[], hidden: Settled[]) => ({
    clusters: rows.length,
    hidden: rows.filter((r) => r.modal !== "split" && hidden.includes(r.modal)).length,
    split: rows.filter((r) => r.modal === "split").length,
  });
  return {
    byPolicy: Object.fromEntries(
      Object.entries(POLICIES).map(([policy, hidden]) => [
        policy,
        Object.fromEntries(
          groups.map((g) => {
            const rows = results.filter((r) => `${r.kind} · ${r.basis}` === g);
            return [
              g,
              {
                ...tally(rows, hidden),
                onACutContext: tally(
                  rows.filter((r) => r.cut),
                  hidden,
                ),
              },
            ];
          }),
        ),
      ]),
    ),
    rightCategory: {
      borrowed: results.filter((r) => r.kind === "borrowed control" && r.right === true).length,
      of: results.filter((r) => r.kind === "borrowed control" && r.right !== null).length,
    },
    stable: {
      atLeastTwoThirds: results.filter((r) => r.answers && r.agreement >= 2 / 3).length,
      of: results.filter((r) => r.answers).length,
    },
    byCase: Object.fromEntries(
      [...new Set(results.map((r) => `${r.id} · ${r.kind}`))].sort().map((k) => {
        const rows = results.filter((r) => `${r.id} · ${r.kind}` === k);
        return [
          k,
          rows.map((r) => ({
            modal: r.modal,
            agreement: r.agreement,
            byAnswer: r.byAnswer,
            cut: r.cut,
          })),
        ];
      }),
    ),
  };
}
