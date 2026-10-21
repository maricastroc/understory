import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { collect, parseLocation } from "@understory/core/collect";
import { LINEAGE_LIMITS, type LineageLimits, lineageOf } from "@understory/core/collect/lineage";
import type { Evidence, LineageStop } from "@understory/core/types";
import type { Case, Gold } from "./eval-check";
import { parseRecords } from "./eval-report";

const proc = process as NodeJS.Process & { loadEnvFile?: (path?: string) => void };
for (const file of [".env.local", ".env"]) if (existsSync(file)) proc.loadEnvFile?.(file);

const RESULTS = "eval/results";
const ANSWERS = `${RESULTS}/2026-10-12-line-attribution.jsonl`;
const SETTLE_MS = 250;

export const WHAT = [
  "How long the walk back through a line's history takes, and what it sends, on the cases of the",
  "gold set, with no model. Each case is collected once, then walked with the limits the app uses",
  "and again with the time limit cut to 300 ms, to see the requests in flight cancelled on a real",
  "network. A hosted repository is walked through the GitHub API, a seeded one through git. The",
  "answer's time is the one kept for the same case in the current run, through OpenRouter pinned to",
  "Groq. The app runs the walk beside the writer and the audit and sends the answer before it waits",
  "for the walk, so a walk longer than the answer only brings the earlier history after it.",
].join(" ");

export type Request = {
  kind: "commit" | "blame" | "other";
  began: number;
  settled: number | null;
  outcome: string;
};

export type Walk = {
  id: string;
  group: "hosted" | "seeded";
  limit: number;
  pass: number;
  ms: number;
  stopped: LineageStop | "not walked";
  entries: number;
  requests: Request[];
};

const kindOf = (url: string): Request["kind"] =>
  url.endsWith("/graphql") ? "blame" : /\/commits\//.test(url) ? "commit" : "other";

export async function timedWalk(
  ev: Evidence,
  limits: LineageLimits,
  clock: () => number = () => performance.now(),
): Promise<Pick<Walk, "ms" | "stopped" | "entries" | "requests">> {
  const real = globalThis.fetch;
  const requests: Request[] = [];
  const t0 = clock();
  const at = () => Math.round(clock() - t0);
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const request: Request = { kind: kindOf(url), began: at(), settled: null, outcome: "pending" };
    requests.push(request);
    try {
      const res = await real(input, init);
      request.outcome = String(res.status);
      return res;
    } catch (e) {
      request.outcome = e instanceof Error && e.name === "AbortError" ? "aborted" : "error";
      throw e;
    } finally {
      request.settled = at();
    }
  };
  try {
    const lineage = await lineageOf(ev, { limits });
    const ms = at();
    await new Promise((r) => setTimeout(r, SETTLE_MS));
    return {
      ms,
      stopped: lineage?.stopped ?? "not walked",
      entries: lineage?.entries.length ?? 0,
      requests,
    };
  } finally {
    globalThis.fetch = real;
  }
}

export const ranOn = (walk: Pick<Walk, "ms" | "requests">) =>
  walk.requests.filter(
    (r) => r.outcome !== "aborted" && (r.settled === null || r.settled > walk.ms),
  ).length;

const quantile = (sorted: number[], q: number) =>
  sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1)] : null;

function count<T>(rows: T[], keyOf: (row: T) => string): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const row of rows) totals[keyOf(row)] = (totals[keyOf(row)] ?? 0) + 1;
  return totals;
}

export function summarize(walks: Walk[], answers: Record<string, number[]>) {
  const groups = [...new Set(walks.map((w) => `${w.group} · ${w.limit} ms`))];
  return Object.fromEntries(
    groups.map((group) => {
      const rows = walks.filter((w) => `${w.group} · ${w.limit} ms` === group);
      const ms = rows.map((w) => w.ms).sort((a, b) => a - b);
      const firsts = rows.flatMap((w) =>
        w.requests[0]?.settled != null ? [w.requests[0].settled - w.requests[0].began] : [],
      );
      const compared = rows.filter((w) => (answers[w.id] ?? []).length > 0);
      return [
        group,
        {
          walks: rows.length,
          cases: new Set(rows.map((w) => w.id)).size,
          ms: { p50: quantile(ms, 0.5), p95: quantile(ms, 0.95), max: ms.at(-1) ?? null },
          stopped: count(rows, (w) => w.stopped),
          requests: {
            max: Math.max(0, ...rows.map((w) => w.requests.length)),
            byWalk: count(rows, (w) => String(w.requests.length)),
            outcomes: count(
              rows.flatMap((w) => w.requests),
              (r) => r.outcome,
            ),
          },
          ranOnAfterTheWalk: rows.reduce((n, w) => n + ranOn(w), 0),
          firstRequestMs: {
            p50: quantile(
              [...firsts].sort((a, b) => a - b),
              0.5,
            ),
            shareOfWalk:
              firsts.length && ms.length
                ? Math.round(
                    (100 * firsts.reduce((a, b) => a + b, 0)) / ms.reduce((a, b) => a + b, 0),
                  ) / 100
                : null,
          },
          longerThanTheAnswer: {
            compared: compared.length,
            walks: compared
              .filter((w) => w.ms > median(answers[w.id]))
              .map((w) => `${w.id}#${w.pass}`),
          },
        },
      ];
    }),
  );
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor((s.length - 1) / 2)] : 0;
};

export function answerTimes(text: string): Record<string, number[]> {
  const times: Record<string, number[]> = {};
  for (const run of parseRecords(text).runs) if (run.narrative) (times[run.id] ??= []).push(run.ms);
  return times;
}

async function main() {
  const out = process.argv[2];
  const passes = Number(process.argv[3] ?? 3);
  if (!out || !Number.isInteger(passes) || passes < 1) {
    console.error("usage: npm run eval:walk -- <out.json> [passes]");
    process.exit(1);
  }
  const gold: Gold = JSON.parse(readFileSync("eval/gold.json", "utf8"));
  const answers = answerTimes(readFileSync(ANSWERS, "utf8"));
  const walks: Walk[] = [];
  for (const c of gold.cases as Case[]) {
    const repoPath = c.repo ?? gold.repo;
    const group: Walk["group"] = existsSync(repoPath) ? "seeded" : "hosted";
    let ev: Evidence;
    try {
      ev = await collect({ repoPath, question: c.question, location: parseLocation(c.location) });
    } catch (e) {
      console.log(`${c.id}: not collected (${e instanceof Error ? e.message : String(e)})`);
      continue;
    }
    const limits = group === "seeded" ? [LINEAGE_LIMITS.ms] : [LINEAGE_LIMITS.ms, 300];
    for (const limit of limits)
      for (let pass = 0; pass < passes; pass++) {
        const timed = await timedWalk(
          ev,
          group === "seeded"
            ? { ...LINEAGE_LIMITS, requests: Number.POSITIVE_INFINITY, ms: limit }
            : { ...LINEAGE_LIMITS, ms: limit },
        );
        if (timed.stopped === "not walked") break;
        walks.push({ id: c.id, group, limit, pass, ...timed });
        console.log(
          `${c.id} · ${group} · ${limit} ms · pass ${pass}: ${timed.ms} ms, ${timed.stopped}, ${timed.requests.length} requests${ranOn(timed) ? `, ${ranOn(timed)} ran on after it` : ""}`,
        );
        await new Promise((r) => setTimeout(r, 200));
      }
  }
  const summary = summarize(walks, answers);
  console.log(`\n${JSON.stringify(summary, null, 2)}\n\n${WHAT}`);
  writeFileSync(
    out,
    `${JSON.stringify({ date: new Date().toISOString(), commit: execFileSync("git", ["rev-parse", "--short", "HEAD"]).toString().trim(), what: WHAT, answers: ANSWERS, limits: LINEAGE_LIMITS, passes, summary, walks }, null, 2)}\n`,
  );
}

if (process.argv[1]?.endsWith("eval-walk.ts")) void main();
