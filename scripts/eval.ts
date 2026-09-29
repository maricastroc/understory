import { existsSync, readFileSync } from "node:fs";
import { getAuditor } from "@understory/core/auditor";
import { collect, parseLocation } from "@understory/core/collect";
import { parseGitHubRepo } from "@understory/core/collect/github";
import { narrate } from "@understory/core/investigate";
import { getModel } from "@understory/core/llm";
import type { Evidence } from "@understory/core/types";
import { type Case, type Gold, type Outcome, outcomeOf, parseArgs, tally } from "./eval-check";

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
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");

async function evidenceFor(repo: string, c: Case): Promise<Evidence | string> {
  try {
    return await collect({
      repoPath: c.repo ?? repo,
      question: c.question,
      location: parseLocation(c.location),
    });
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}

async function main() {
  const { repeat, delayMs, only } = parseArgs(process.argv.slice(2));

  const model = getModel();
  if (!model) {
    console.error(red("GROQ_API_KEY is not set (.env.local) — the eval needs the model to run."));
    process.exit(1);
  }

  const gold: Gold = JSON.parse(readFileSync("eval/gold.json", "utf8"));
  if (!parseGitHubRepo(gold.repo) && !existsSync(gold.repo)) {
    console.error(red(`Local repo "${gold.repo}" not found — run \`npm run seed:demo\` first.`));
    process.exit(1);
  }

  const cases = only.length ? gold.cases.filter((c) => only.includes(c.id)) : gold.cases;
  const auditor = getAuditor();
  console.log(
    bold("\nUnderstory — eval") +
      dim(`  (${cases.length} cases × ${repeat})`) +
      dim(`\nsynthesis ${model.modelId} · audit ${auditor?.primary.modelId ?? "none"}\n`),
  );

  const runs: { expect: Case["expect"]; outcome: Outcome }[] = [];
  let first = true;

  for (const c of cases) {
    const ev = await evidenceFor(gold.repo, c);
    const outcomes: Outcome[] = [];
    for (let r = 0; r < repeat; r++) {
      if (!first && delayMs) await sleep(delayMs);
      first = false;
      const outcome: Outcome =
        typeof ev === "string"
          ? { kind: "error", message: `collect: ${ev}` }
          : outcomeOf(c.expect, await narrate(ev), ev);
      outcomes.push(outcome);
      runs.push({ expect: c.expect, outcome });
    }

    const passed = outcomes.filter((o) => o.kind === "pass").length;
    const errored = outcomes.filter((o) => o.kind === "error").length;
    const scored = repeat - errored;
    const tag =
      scored === 0
        ? yellow("ERROR")
        : passed === scored
          ? green("PASS")
          : passed === 0
            ? red("FAIL")
            : yellow("FLAKY");
    const ratio =
      repeat > 1 ? dim(` ${passed}/${scored}${errored ? ` +${errored} errored` : ""}`) : "";
    console.log(`  ${tag}${ratio}  ${bold(c.id.padEnd(16))} ${dim(c.question)}`);
    const fail = outcomes.find((o) => o.kind === "fail");
    if (fail?.kind === "fail") console.log(`         ${red("↳ " + fail.fails.join("; "))}`);
    const error = outcomes.find((o) => o.kind === "error");
    if (error?.kind === "error") console.log(`         ${yellow("↳ " + error.message)}`);
  }

  const t = tally(runs);
  const scored = t.passed + t.failed;
  console.log(
    "\n" +
      bold(`${t.passed}/${scored} scored runs passed`) +
      dim(` (${pct(t.passed, scored)})`) +
      (t.errored ? yellow(`   ${t.errored} errored (not scored)`) : "") +
      (t.refusals.total
        ? `   ${bold("out-of-scope refusal:")} ${t.refusals.correct}/${t.refusals.total} (${pct(t.refusals.correct, t.refusals.total)})`
        : ""),
  );
  process.exit(t.failed === 0 && t.errored === 0 ? 0 : 1);
}

void main();
