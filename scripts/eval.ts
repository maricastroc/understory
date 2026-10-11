import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { getAuditor } from "@understory/core/auditor";
import { collect, parseLocation } from "@understory/core/collect";
import { parseGitHubRepo } from "@understory/core/collect/github";
import { narrate } from "@understory/core/investigate";
import { getModel } from "@understory/core/llm";
import type { Evidence } from "@understory/core/types";
import {
  type Case,
  type Gold,
  type Outcome,
  outcomeOf,
  parseArgs,
  selectCases,
  tally,
} from "./eval-check";
import {
  type MetaRecord,
  type RunRecord,
  caseStatus,
  summaryLines,
  verdictOf,
} from "./eval-report";

const proc = process as NodeJS.Process & { loadEnvFile?: (path?: string) => void };
try {
  proc.loadEnvFile?.(".env.local");
} catch {
  //
}

const color = process.stdout.isTTY && !process.env.NO_COLOR;
const wrap = (code: string) => (s: string) => (color ? `\x1b[${code}m${s}\x1b[0m` : s);
const bold = wrap("1");
const dim = wrap("2");
const red = wrap("31");
const green = wrap("32");
const yellow = wrap("33");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const SEEDS: Record<string, string> = {
  ".demo/payments-service": "npm run seed:demo",
  ".demo/warehouse-sync": "npm run seed:eval",
};

async function evidenceFor(repo: string, c: Case): Promise<Evidence | string> {
  try {
    return await collect({
      repoPath: repo,
      question: c.question,
      location: parseLocation(c.location),
    });
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}

function headCommit(): string | null {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

const TAG: Record<string, (s: string) => string> = {
  pass: green,
  fail: red,
  unstable: yellow,
  errored: yellow,
  pending: yellow,
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { repeat, delayMs, out } = args;

  const model = getModel();
  if (!model) {
    console.error(red("GROQ_API_KEY is not set (.env.local) — the eval needs the model to run."));
    process.exit(1);
  }

  const gold: Gold = JSON.parse(readFileSync("eval/gold.json", "utf8"));
  const cases = selectCases(gold, args);
  const repoOf = (c: Case) => c.repo ?? gold.repo;
  for (const repo of new Set(cases.map(repoOf))) {
    if (parseGitHubRepo(repo) || existsSync(repo)) continue;
    const seed = SEEDS[repo] ? ` — run \`${SEEDS[repo]}\` first.` : ".";
    console.error(red(`Local repo "${repo}" not found${seed}`));
    process.exit(1);
  }

  const auditor = getAuditor();
  const meta: MetaRecord = {
    type: "meta",
    date: new Date().toISOString(),
    commit: headCommit(),
    synthesis: model.modelId,
    audit: auditor?.primary.modelId ?? "none",
    repeat,
    delayMs,
    cases: cases.length,
  };
  console.log(
    bold("\nUnderstory — eval") +
      dim(`  (${cases.length} cases × ${repeat})`) +
      dim(`\nsynthesis ${meta.synthesis} · audit ${meta.audit}\n`),
  );
  if (out) {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, `${JSON.stringify(meta)}\n`);
  }

  const evidence = new Map<string, Evidence | string>();
  for (const c of cases) evidence.set(c.id, await evidenceFor(repoOf(c), c));

  const records: RunRecord[] = [];
  let first = true;
  for (let pass = 0; pass < repeat; pass++) {
    for (const c of cases) {
      const ev = evidence.get(c.id)!;
      const started = Date.now();
      let outcome: Outcome;
      let narrative: RunRecord["narrative"] = null;
      if (typeof ev === "string") {
        outcome = { kind: "error", message: `collect: ${ev}` };
      } else {
        if (!first && delayMs) await sleep(delayMs);
        first = false;
        const result = await narrate(ev);
        narrative = result.narrative;
        outcome = outcomeOf(c.expect, result, ev);
      }
      const record: RunRecord = {
        type: "run",
        id: c.id,
        set: c.set,
        category: c.category,
        source: c.source,
        pass,
        ms: Date.now() - started,
        outcome,
        artifacts:
          typeof ev === "string"
            ? []
            : ev.artifacts.map((a) => ({ id: a.id, kind: a.kind, chars: a.body.length })),
        narrative,
      };
      records.push(record);
      if (out) appendFileSync(out, `${JSON.stringify(record)}\n`);
      if (repeat > 1) console.log(dim(`  pass ${pass + 1} · ${c.id} · ${outcome.kind}`));
    }
  }

  if (repeat > 1) console.log("");
  for (const c of cases) {
    const runs = records.filter((r) => r.id === c.id);
    const status = caseStatus(runs.map((r) => verdictOf(r)));
    const kinds = runs.map((r) => r.outcome.kind);
    const label = status === "pending" ? "REVIEW" : status.toUpperCase();
    const ratio = repeat > 1 ? dim(` ${kinds.join(" ")}`) : "";
    console.log(
      `  ${TAG[status](label.padEnd(8))}${ratio}  ${bold(c.id.padEnd(24))} ${dim(c.question)}`,
    );
    const fail = runs.find((r) => r.outcome.kind === "fail")?.outcome;
    if (fail?.kind === "fail") console.log(`           ${red("↳ " + fail.fails.join("; "))}`);
    const error = runs.find((r) => r.outcome.kind === "error")?.outcome;
    if (error?.kind === "error") console.log(`           ${yellow("↳ " + error.message)}`);
  }

  const byCase = new Map(cases.map((c) => [c.id, c]));
  const t = tally(records.map((r) => ({ expect: byCase.get(r.id)!.expect, outcome: r.outcome })));
  console.log("");
  for (const line of summaryLines(records)) console.log(`  ${line}`);
  console.log(
    "\n" +
      bold(`${t.passed} of ${t.passed + t.failed} automatically scored runs passed`) +
      (t.review ? yellow(` · ${t.review} awaiting manual review`) : "") +
      (t.errored ? yellow(` · ${t.errored} errored (not scored)`) : "") +
      (t.refusals.total
        ? ` · out-of-scope refusal ${t.refusals.correct}/${t.refusals.total}`
        : "") +
      dim("\nA count over this set, by category above. It is not a success rate.") +
      (out ? dim(`\nraw runs written to ${out}`) : ""),
  );
  process.exit(t.failed === 0 && t.errored === 0 ? 0 : 1);
}

void main();
