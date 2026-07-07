import { existsSync, readFileSync } from "node:fs";
import { collect, parseLocation } from "../src/lib/collect";
import { synthesize } from "../src/lib/synthesize";
import type { Evidence, VerifiedNarrative } from "../src/lib/types";
import { verify } from "../src/lib/verify";

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

type Expect = {
  answerable?: boolean;
  recorded?: boolean;
  grounded?: boolean;
  minScore?: number;
  level?: "low" | "medium" | "high";
  citesBodyMatch?: string;
};
type Case = { id: string; repo?: string; location: string; question: string; expect: Expect };
type Gold = { repo: string; cases: Case[] };

function checkExpect(e: Expect, n: VerifiedNarrative, ev: Evidence): string[] {
  const fails: string[] = [];
  const c = n.confidence;
  if (e.answerable !== undefined && n.answerable !== e.answerable)
    fails.push(`answerable ${n.answerable} ≠ ${e.answerable}`);
  if (e.recorded !== undefined && n.recorded !== e.recorded)
    fails.push(`recorded ${n.recorded} ≠ ${e.recorded}`);
  if (e.grounded !== undefined && n.grounded !== e.grounded)
    fails.push(`grounded ${n.grounded} ≠ ${e.grounded}`);
  if (e.minScore !== undefined && c.score < e.minScore)
    fails.push(`score ${c.score} < ${e.minScore}`);
  if (e.level !== undefined && c.level !== e.level) fails.push(`level ${c.level} ≠ ${e.level}`);
  if (e.citesBodyMatch) {
    const re = new RegExp(e.citesBodyMatch, "i");
    const cited = ev.artifacts.filter((a) => n.citations.includes(a.id));
    if (!cited.some((a) => re.test(a.body) || re.test(a.title)))
      fails.push(`no cited source matches /${e.citesBodyMatch}/`);
  }
  return fails;
}

type Run = { fails: string[]; answerable: boolean; answer: string };

async function runOnce(repo: string, c: Case): Promise<Run> {
  try {
    const ev = await collect({
      repoPath: c.repo ?? repo,
      question: c.question,
      location: parseLocation(c.location),
    });
    const n = verify(ev, await synthesize(ev));
    return { fails: checkExpect(c.expect, n, ev), answerable: n.answerable, answer: n.answer };
  } catch (err) {
    return {
      fails: [`error: ${err instanceof Error ? err.message : String(err)}`],
      answerable: true,
      answer: "",
    };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const repeat = Math.max(1, Number(args[args.indexOf("--repeat") + 1]) || 1);
  const only = args.filter((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--repeat");

  if (!process.env.GROQ_API_KEY) {
    console.error(red("GROQ_API_KEY is not set (.env.local) — the eval needs the model to run."));
    process.exit(1);
  }

  const gold: Gold = JSON.parse(readFileSync("eval/gold.json", "utf8"));
  if (!parseGitHub(gold.repo) && !existsSync(gold.repo)) {
    console.error(red(`Local repo "${gold.repo}" not found — run \`npm run seed:demo\` first.`));
    process.exit(1);
  }

  const cases = only.length ? gold.cases.filter((c) => only.includes(c.id)) : gold.cases;
  console.log(bold(`\nGit Investigator — eval`) + dim(`  (${cases.length} cases × ${repeat})\n`));

  let runsPassed = 0;
  let runsTotal = 0;
  let oosCorrect = 0;
  let oosTotal = 0;

  for (const c of cases) {
    let passed = 0;
    const sampleFail: string[] = [];
    for (let r = 0; r < repeat; r++) {
      const run = await runOnce(gold.repo, c);
      runsTotal++;
      if (run.fails.length === 0) {
        passed++;
        runsPassed++;
      } else if (sampleFail.length === 0) {
        sampleFail.push(...run.fails);
      }
      if (c.expect.answerable === false) {
        oosTotal++;
        if (!run.answerable) oosCorrect++;
      }
    }
    const ok = passed === repeat;
    const tag = ok ? green("PASS") : passed === 0 ? red("FAIL") : yellow("FLAKY");
    const ratio = repeat > 1 ? dim(` ${passed}/${repeat}`) : "";
    console.log(`  ${tag}${ratio}  ${bold(c.id.padEnd(16))} ${dim(c.question)}`);
    if (!ok) console.log(`         ${red("↳ " + sampleFail.join("; "))}`);
  }

  const pct = Math.round((runsPassed / runsTotal) * 100);
  console.log(
    "\n" +
      bold(`${runsPassed}/${runsTotal} runs passed`) +
      dim(` (${pct}%)`) +
      (oosTotal
        ? `   ${bold("out-of-scope refusal:")} ${oosCorrect}/${oosTotal} (${Math.round((oosCorrect / oosTotal) * 100)}%)`
        : ""),
  );
  process.exit(runsPassed === runsTotal ? 0 : 1);
}

function parseGitHub(s: string): boolean {
  return /^(https?:\/\/github\.com\/|git@github\.com:|[\w.-]+\/[\w.-]+$)/.test(s.trim());
}

void main();
