import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { collect, parseLocation } from "@git-investigator/core/collect";
import { checkEntailment } from "@git-investigator/core/entail";
import { getModel, type Model } from "@git-investigator/core/llm";
import { traceProvenance } from "@git-investigator/core/provenance";
import { synthesize } from "@git-investigator/core/synthesize";
import type { Evidence, VerifiedNarrative } from "@git-investigator/core/types";
import { verify } from "@git-investigator/core/verify";

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
const gray = wrap("90");
const RULE = gray("─".repeat(66));

export type Level = "high" | "medium" | "low";
export type OwnerVerdict = "supported" | "weak" | "unsupported" | "absent";

export type RunOutcome =
  | {
      ok: true;
      level: Level;
      score: number;
      owner: OwnerVerdict;
      supported: number;
      misattributed: number;
      audited: boolean;
    }
  | { ok: false; reason: "rate-limit" | "error"; message: string };

export type VarianceSummary = {
  runs: number;
  ok: number;
  failed: { total: number; rateLimit: number; error: number };
  levels: Record<Level, number>;
  levelPct: Record<Level, number>;
  distinctLevels: number;
  stable: boolean;
  score: { min: number; max: number; mean: number; swing: number } | null;
  owner: Record<OwnerVerdict, number>;
  auditUnavailable: number;
};

export function summarizeVariance(outcomes: RunOutcome[]): VarianceSummary {
  const ok = outcomes.filter((o): o is Extract<RunOutcome, { ok: true }> => o.ok);
  const failed = outcomes.filter((o): o is Extract<RunOutcome, { ok: false }> => !o.ok);

  const levels: Record<Level, number> = { high: 0, medium: 0, low: 0 };
  const owner: Record<OwnerVerdict, number> = { supported: 0, weak: 0, unsupported: 0, absent: 0 };
  let auditUnavailable = 0;
  for (const o of ok) {
    levels[o.level]++;
    owner[o.owner]++;
    if (!o.audited) auditUnavailable++;
  }

  const scores = ok.map((o) => o.score);
  const okN = ok.length;
  const score = okN
    ? {
        min: Math.min(...scores),
        max: Math.max(...scores),
        mean: scores.reduce((a, b) => a + b, 0) / okN,
        swing: Math.max(...scores) - Math.min(...scores),
      }
    : null;

  const distinctLevels = (Object.keys(levels) as Level[]).filter((l) => levels[l] > 0).length;
  const pct = (n: number) => (okN ? n / okN : 0);

  return {
    runs: outcomes.length,
    ok: okN,
    failed: {
      total: failed.length,
      rateLimit: failed.filter((f) => f.reason === "rate-limit").length,
      error: failed.filter((f) => f.reason === "error").length,
    },
    levels,
    levelPct: { high: pct(levels.high), medium: pct(levels.medium), low: pct(levels.low) },
    distinctLevels,
    stable: distinctLevels <= 1,
    score,
    owner,
    auditUnavailable,
  };
}

function ownerIdsOf(ev: Evidence): Set<string> {
  const p = traceProvenance(ev);
  return new Set(p ? [p.commit, ...(p.pr ? [p.pr] : [])] : []);
}

export function ownerVerdictOf(v: VerifiedNarrative, ownerIds: Set<string>): OwnerVerdict {
  const checks = v.entailment?.checked ? v.entailment.checks : [];
  const own = checks.filter((c) => ownerIds.has(c.citation));
  if (own.length === 0) return "absent";
  if (own.some((c) => c.status === "supported")) return "supported";
  if (own.some((c) => c.status === "weak")) return "weak";
  return "unsupported";
}

const RATE = /rate.?limit|tokens per (minute|day)|\bTPM\b|\bTPD\b|quota|\b429\b/i;

async function runOnce(ev: Evidence, model: Model, ownerIds: Set<string>): Promise<RunOutcome> {
  try {
    const narrative = await synthesize(ev, model);
    const entailment = await checkEntailment(ev, narrative, model).catch(() => undefined);
    const v = verify(ev, narrative, entailment);
    return {
      ok: true,
      level: v.confidence.level,
      score: v.confidence.score,
      owner: ownerVerdictOf(v, ownerIds),
      supported: v.entailment?.supported ?? 0,
      misattributed: v.entailment?.misattributed ?? 0,
      audited: v.entailment?.checked ?? false,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, reason: RATE.test(message) ? "rate-limit" : "error", message };
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function bar(pct: number, width = 12): string {
  const filled = Math.round(pct * width);
  return "█".repeat(filled) + gray("░".repeat(width - filled));
}

function paintLevel(level: Level, s: string): string {
  return (level === "high" ? green : level === "medium" ? yellow : red)(s);
}

function printSummary(s: VarianceSummary) {
  console.log();
  console.log(RULE);
  console.log(`${gray("Distribution")} ${gray(`(${s.ok} ok / ${s.runs} runs)`)}`);
  console.log(RULE);

  if (s.ok === 0) {
    console.log(yellow("  No run completed — every attempt failed."));
  } else {
    (["high", "medium", "low"] as Level[]).forEach((l) => {
      const n = s.levels[l];
      const label = paintLevel(l, l.toUpperCase().padEnd(6));
      console.log(
        `  ${label}  ${bar(s.levelPct[l])}  ${bold(String(n))} ${gray(`(${Math.round(s.levelPct[l] * 100)}%)`)}`,
      );
    });
    if (s.score) {
      const pc = (n: number) => `${Math.round(n * 100)}%`;
      console.log();
      console.log(
        `  ${gray("Score  ")} min ${pc(s.score.min)} · max ${pc(s.score.max)} · mean ${pc(s.score.mean)} · ${bold(`swing ${Math.round(s.score.swing * 100)}pts`)}`,
      );
    }
    const o = s.owner;
    console.log(
      `  ${gray("Owner  ")} ${green(`supported ${o.supported}`)} · ${yellow(`weak ${o.weak}`)} · ${red(`unsupported ${o.unsupported}`)} · ${gray(`absent ${o.absent}`)}`,
    );
    if (s.auditUnavailable > 0) {
      console.log(
        `  ${gray("Audit  ")} ${yellow(`${s.auditUnavailable} run(s) had no completed citation audit (capped)`)}`,
      );
    }
    console.log(
      `  ${gray("Stable ")} ${s.stable ? green("yes — one level across all runs") : red(`no — ${s.distinctLevels} distinct levels (phrasing-dependent)`)}`,
    );
  }

  if (s.failed.total > 0) {
    console.log(
      `  ${gray("Failed ")} ${s.failed.total} ${gray(`(rate-limit ${s.failed.rateLimit} · error ${s.failed.error})`)}`,
    );
  }
  console.log(RULE);
}

function usage(): never {
  console.error(
    [
      bold("Usage:"),
      "  npm run variance -- <repoPath> <file:line[-endLine]> [--runs N] [--delay S] [--json] [question...]",
      "",
      bold("Examples:"),
      '  npm run variance -- .cache/repos/bkeepers/dotenv lib/dotenv.rb:35 --runs 8 "why alias overload?"',
      '  npm run variance -- .demo/payments-service src/billing/charge.ts:8 --runs 5 --delay 10 "why cap retries at 3?"',
      "",
      dim("Collects the evidence ONCE, then runs synthesize→entail→verify N times — so the"),
      dim(
        "measured spread is the model's, not the collector's. --delay paces runs (free-tier TPM).",
      ),
    ].join("\n"),
  );
  process.exit(2);
}

function numFlag(raw: string[], name: string, def: number): number {
  const i = raw.indexOf(name);
  if (i < 0) return def;
  const v = Number(raw[i + 1]);
  return Number.isFinite(v) ? v : def;
}

async function main() {
  const raw = process.argv.slice(2);
  const json = raw.includes("--json");
  const runs = Math.max(1, numFlag(raw, "--runs", 5));
  const delay = Math.max(0, numFlag(raw, "--delay", 0));

  const valued = new Set(["--runs", "--delay"]);
  const consumed = new Set<number>();
  raw.forEach((t, i) => {
    if (valued.has(t)) {
      consumed.add(i);
      consumed.add(i + 1);
    }
  });
  const positionals = raw.filter((t, i) => !t.startsWith("--") && !consumed.has(i));
  const [repoPath, locationArg, ...rest] = positionals;
  if (!repoPath || !locationArg) usage();

  const location = parseLocation(locationArg);
  const question = rest.join(" ") || "Why is this line the way it is? Reconstruct why it changed.";

  const model = getModel();
  if (!model) {
    console.error(yellow("⚠ GROQ_API_KEY is not set — put it in .env.local."));
    process.exit(1);
  }

  const evidence = await collect({ repoPath, question, location });
  const ownerIds = ownerIdsOf(evidence);

  if (!json) {
    console.log(RULE);
    console.log(`${bold("GIT INVESTIGATOR")} ${gray("· variance eval")}`);
    console.log(RULE);
    console.log(`${gray("Question:")} ${question}`);
    console.log(`${gray("Repo:    ")} ${evidence.repo.name ?? evidence.repo.path}`);
    console.log(`${gray("Location:")} ${locationArg}`);
    console.log(
      `${gray("Evidence:")} collected once · ${evidence.artifacts.length} artifact(s) ${gray("(variance is LLM-only)")} · ${runs} runs`,
    );
    console.log();
    console.log(gray(" Run  Level    Score  Owner        Audit"));
  }

  const outcomes: RunOutcome[] = [];
  for (let i = 0; i < runs; i++) {
    if (i > 0 && delay > 0) await sleep(delay * 1000);
    const o = await runOnce(evidence, model, ownerIds);
    outcomes.push(o);
    if (!json) {
      const n = String(i + 1).padStart(3);
      if (o.ok) {
        const lvl = paintLevel(o.level, o.level.toUpperCase().padEnd(6));
        const sc = `${Math.round(o.score * 100)}%`.padStart(4);
        console.log(
          `  ${n}  ${lvl}  ${sc}   ${o.owner.padEnd(11)}  ${gray(`sup ${o.supported} · mis ${o.misattributed}${o.audited ? "" : " · no-audit"}`)}`,
        );
      } else {
        console.log(
          `  ${n}  ${gray("—")}  ${o.reason === "rate-limit" ? yellow("rate-limited") : red("error")}`,
        );
      }
    }
  }

  const summary = summarizeVariance(outcomes);
  if (json) {
    console.log(
      JSON.stringify({ evidence: { location: locationArg, question }, outcomes, summary }, null, 2),
    );
    return;
  }
  printSummary(summary);
}

function isEntry(): boolean {
  try {
    return (
      process.argv[1] != null &&
      realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
    );
  } catch {
    return false;
  }
}

if (isEntry()) {
  main().catch((err: unknown) => {
    console.error(bold(red("✗")), err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
