import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { getAuditor, runAudit } from "@understory/core/auditor";
import { collect, parseLocation } from "@understory/core/collect";
import { finalizeClaim, judgeClaim } from "@understory/core/entail";
import type { Artifact } from "@understory/core/types";
import {
  type AuditedClaim,
  type Judgement,
  type ReplayMeta,
  auditedClaims,
  parseReplay,
  replayLines,
} from "./eval-audit-claims";
import { type Case, type Gold, parseArgs } from "./eval-check";
import { parseRecords } from "./eval-report";
import { routeThroughOpenRouter, usageLines } from "./eval-route";

const proc = process as NodeJS.Process & { loadEnvFile?: (path?: string) => void };
for (const file of [".env.local", ".env"]) if (existsSync(file)) proc.loadEnvFile?.(file);

const PARALLEL = 6;

function stop(message: string): never {
  console.error(message);
  process.exit(1);
}

function headCommit(): string | null {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

async function pooled<T>(items: T[], work: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < items.length) await work(items[next++]);
  };
  await Promise.all(Array.from({ length: PARALLEL }, worker));
}

type Task = { claim: AuditedClaim; question: string; sources: Artifact[]; replay: number };

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.problems.length) stop(`Cannot read the arguments: ${args.problems.join("; ")}.`);
  const files = args.only;
  if (files.length === 0)
    stop(
      "usage: npm run eval:audit -- eval/results/<run>.jsonl [...] [--repeat 3] [--via openrouter] [--out <file>]",
    );
  for (const file of files) if (!existsSync(file)) stop(`"${file}" not found.`);

  const first = parseReplay(readFileSync(files[0], "utf8"));
  if (first.meta?.kind === "audit-replay") {
    for (const line of replayLines(first.judgements)) console.log(line);
    return;
  }

  const auditor = getAuditor();
  if (!auditor) stop("GROQ_API_KEY is not set (.env.local): the replay needs the audit model.");
  const routerKey = process.env.OPEN_ROUTER_API_KEY;
  if (args.via && !routerKey)
    stop("--via openrouter needs OPEN_ROUTER_API_KEY in .env or .env.local.");
  const route = args.via && routerKey ? routeThroughOpenRouter(routerKey) : null;
  if (route) globalThis.fetch = route.fetch;
  if (args.out && existsSync(args.out))
    stop(`"${args.out}" already holds a run. Kept runs are not overwritten: pick another name.`);

  const gold: Gold = JSON.parse(readFileSync("eval/gold.json", "utf8"));
  const cases = new Map<string, Case>(gold.cases.map((c) => [c.id, c]));
  const claims = auditedClaims(
    files.flatMap((file) => parseRecords(readFileSync(file, "utf8")).runs),
  ).filter(
    (c) =>
      cases.has(c.id) &&
      (args.category === null || c.category === args.category) &&
      (args.set === null || c.set === args.set),
  );
  if (claims.length === 0) stop("Those runs hold no audited claim for that selection.");

  const repoOf = (c: Case) => c.repo ?? gold.repo;
  const ids = [...new Set(claims.map((c) => c.id))];
  const artifacts = new Map<string, Artifact[]>();
  for (const id of ids) {
    const c = cases.get(id)!;
    const ev = await collect({
      repoPath: repoOf(c),
      question: c.question,
      location: parseLocation(c.location),
    });
    artifacts.set(id, ev.artifacts);
  }
  const foreign = (id: string, count: number): Artifact[] => {
    const at = ids.indexOf(id);
    for (let step = 1; step < ids.length; step++) {
      const other = ids[(at + step) % ids.length];
      if (repoOf(cases.get(other)!) === repoOf(cases.get(id)!)) continue;
      const found = artifacts.get(other) ?? [];
      if (found.length) return found.slice(0, Math.max(1, count));
    }
    return [];
  };

  const tasks: Task[] = [];
  for (const claim of claims) {
    const question = cases.get(claim.id)!.question;
    const byId = new Map((artifacts.get(claim.id) ?? []).map((a) => [a.id, a]));
    const sources = claim.citations.map((id) => byId.get(id)).filter((a): a is Artifact => !!a);
    if (sources.length === 0) continue;
    for (let replay = 0; replay < args.repeat; replay++)
      tasks.push({ claim, question, sources, replay });
    const others = foreign(claim.id, sources.length);
    if (others.length) tasks.push({ claim, question, sources: others, replay: -1 });
  }

  const meta: ReplayMeta = {
    type: "meta",
    kind: "audit-replay",
    date: new Date().toISOString(),
    commit: headCommit(),
    audit: auditor.primary.modelId,
    fallback: auditor.fallback?.modelId ?? null,
    repeat: args.repeat,
    claims: claims.length,
    from: files,
    ...(route ? { via: "OpenRouter, pinned to Groq" } : {}),
  };
  console.log(
    `Understory — audit replay (${claims.length} claims × ${args.repeat}, plus one control each)\naudit ${meta.audit}${meta.via ? ` · via ${meta.via}` : ""}\n`,
  );
  if (args.out) {
    mkdirSync(dirname(args.out), { recursive: true });
    writeFileSync(args.out, `${JSON.stringify(meta)}\n`);
  }

  const judgements: Judgement[] = [];
  await pooled(tasks, async ({ claim, question, sources, replay }) => {
    const control = replay < 0;
    const base = {
      type: "judgement" as const,
      id: claim.id,
      set: claim.set,
      category: claim.category,
      source: claim.source,
      claim: claim.text,
      citations: claim.citations,
      replay: control ? 0 : replay,
      control,
    };
    let record: Judgement;
    try {
      const { value, fellBack } = await runAudit(auditor, (model) =>
        judgeClaim(question, claim.text, sources, model),
      );
      const verdict = finalizeClaim(sources, value);
      record = { ...base, raw: value, status: verdict.status, quote: verdict.quote, fellBack };
    } catch (err) {
      record = {
        ...base,
        raw: null,
        status: null,
        quote: null,
        fellBack: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
    judgements.push(record);
    if (args.out) appendFileSync(args.out, `${JSON.stringify(record)}\n`);
    if (judgements.length % 50 === 0) console.log(`  ${judgements.length} of ${tasks.length}`);
  });

  console.log("");
  for (const line of replayLines(judgements)) console.log(line);
  if (route) {
    const usage = route.usage();
    if (args.out) appendFileSync(args.out, `${JSON.stringify({ type: "usage", models: usage })}\n`);
    for (const line of usageLines(usage)) console.log(line);
  }
  if (args.out) console.log(`raw judgements written to ${args.out}`);
}

void main();
