import type { FileHistory, PrLookup } from "@git-investigator/core/types";
import type { HistoryMapControl } from "../history/use-history-map";
import type { CoreState } from "../history/types";
import { syntheticOverview } from "./synthetic-overview";

const HEAD = Date.parse(syntheticOverview.head!.date);
const TONE: Record<string, PrLookup> = { f: "found", n: "none", u: "skipped" };

type Marks = Array<[number, number, "f" | "n" | "u"]>;

const MARKS: Record<string, Marks> = {
  "src/billing/charge.ts": [
    [2.6, 2, "f"],
    [3.1, 1, "f"],
    [3.5, 4, "f"],
    [4.7, 1, "n"],
    [5.3, 9, "n"],
  ],
  "src/billing/refund.ts": [
    [1.2, 1, "n"],
    [4.1, 7, "f"],
  ],
  "src/billing/ledger.ts": [
    [0.3, 6, "f"],
    [1.4, 12, "f"],
    [2.3, 4, "n"],
    [4.4, 38, "f"],
  ],
  "src/billing/invoice.ts": [
    [0.2, 5, "f"],
    [1.8, 37, "f"],
  ],
  "src/webhooks/router.ts": [
    [0.1, 14, "f"],
    [0.7, 20, "f"],
    [0.8, 3, "n"],
    [2.1, 51, "f"],
  ],
  "src/webhooks/verify.ts": [
    [2, 13, "f"],
    [2.7, 6, "n"],
    [5.4, 33, "f"],
  ],
  "src/webhooks/legacy.ts": [
    [2, 6, "f"],
    [5.4, 82, "f"],
  ],
  "src/lib/sleep.ts": [[5.3, 4, "n"]],
  "src/lib/log.ts": [
    [1.9, 18, "f"],
    [2.7, 12, "n"],
  ],
  "src/lib/retry.ts": [[0.6, 25, "f"]],
  "config/flags.ts": [
    [0.7, 4, "f"],
    [1.4, 3, "u"],
    [2.1, 5, "n"],
  ],
  "config/env.ts": [
    [1, 6, "n"],
    [3.1, 8, "u"],
    [5.3, 6, "n"],
  ],
  "tests/charge.spec.ts": [
    [0.8, 30, "f"],
    [3.5, 110, "f"],
  ],
  "tests/webhooks.spec.ts": [
    [1.1, 49, "n"],
    [2.8, 111, "f"],
  ],
};

const at = (years: number) => new Date(HEAD - years * 365.25 * 86_400_000).toISOString();

export function syntheticHistory(path: string): FileHistory {
  const marks = MARKS[path] ?? [];
  const blobSha = syntheticOverview.files.find((f) => f.path === path)?.blobSha ?? "";
  return {
    path,
    blobSha,
    status: "mapped",
    lineCount: marks.reduce((a, [, lines]) => a + lines, 0),
    marks: marks.map(([years, lines, tone], i) => ({
      sha: `${path.length.toString(16)}${i}`.padEnd(40, "a"),
      at: at(years),
      lines,
      prLookup: TONE[tone],
      boundary: false,
    })),
    cut: false,
  };
}

const CACHED = ["src/billing/charge.ts", "src/billing/refund.ts"];
const AUTO = ["src/webhooks/router.ts", "config/flags.ts", "src/webhooks/verify.ts"];

function control(
  mapped: string[],
  mapping: string[],
  extra: Array<[string, CoreState]> = [],
): HistoryMapControl {
  const states = new Map<string, CoreState>([
    ...mapped.map(
      (p) => [p, { status: "mapped", history: syntheticHistory(p) }] as [string, CoreState],
    ),
    ...mapping.map((p) => [p, { status: "mapping", history: null }] as [string, CoreState]),
    ...extra,
  ]);
  const remaining = syntheticOverview.files.filter((f) => !states.has(f.path)).length;
  return {
    states,
    mapped: [...states.values()].filter((s) => s.status === "mapped").length,
    mapping: mapping.length,
    remaining,
    mapMore: remaining ? () => {} : null,
    mapFile: () => {},
  };
}

const ALL = syntheticOverview.files.map((f) => f.path);
const LEGACY = "src/webhooks/legacy.ts";

function scaled(path: string, factor: number, oldest: number | null = null): CoreState {
  const h = syntheticHistory(path);
  const marks = h.marks.map((m, i) => ({
    ...m,
    at:
      oldest !== null && i === h.marks.length - 1
        ? at(oldest)
        : new Date(HEAD - (HEAD - Date.parse(m.at)) * factor).toISOString(),
  }));
  return { status: "mapped", history: { ...h, marks } };
}

export const SYNTHETIC_MAP_STATES: Record<string, () => HistoryMapControl> = {
  cold: () => control([], []),
  partial: () => control(CACHED, []),
  auto: () => control([...CACHED, ...AUTO], []),
  mapping: () =>
    control(
      [...CACHED, ...AUTO, "src/billing/ledger.ts"],
      ALL.filter((p) => ![...CACHED, ...AUTO, "src/billing/ledger.ts"].includes(p)),
    ),
  warm: () => control(ALL, []),
  outlier: () =>
    control(
      [],
      [],
      ALL.map((p) => [p, p === LEGACY ? scaled(p, 0.1, 14) : scaled(p, 0.1)]),
    ),
  unknown: () =>
    control(
      CACHED,
      [],
      [
        [
          "src/webhooks/router.ts",
          {
            status: "mapped",
            history: {
              ...syntheticHistory("src/webhooks/router.ts"),
              marks: syntheticHistory("src/webhooks/router.ts").marks.map((m) => ({
                ...m,
                prLookup: "failed" as const,
              })),
            },
          },
        ],
        [
          "src/webhooks/legacy.ts",
          {
            status: "mapped",
            history: { ...syntheticHistory("src/webhooks/legacy.ts"), cut: true },
          },
        ],
        ["src/webhooks/verify.ts", { status: "unavailable", history: null }],
        ["tests/webhooks.spec.ts", { status: "too-large", history: null }],
      ],
    ),
};
