import { collect, parseLocation } from "@understory/core/collect";
import { checkEntailment } from "@understory/core/entail";
import { cosmeticOrigin } from "@understory/core/cosmetic";
import { getAuditor } from "@understory/core/auditor";
import { getModel } from "@understory/core/llm";
import { traceProvenance } from "@understory/core/provenance";
import { buildSynthesisInput, synthesize } from "@understory/core/synthesize";
import { verify } from "@understory/core/verify";
import type { Artifact, Evidence, VerifiedNarrative } from "@understory/core/types";

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
const mag = wrap("35");
const cyan = wrap("36");
const gray = wrap("90");

const RULE = gray("─".repeat(66));
const letter = (i: number) => String.fromCharCode(65 + i);

function usage(): never {
  console.error(
    [
      bold("Usage:"),
      "  npm run dig -- <repoPath> <file:line[-endLine]> [--why] [--dry-run] [--json] [question...]",
      "",
      bold("Examples:"),
      "  npm run dig -- ../payments-service src/billing/charge.ts:8",
      '  npm run dig -- ../payments-service src/billing/charge.ts:8 --why "why cap retries at 3?"',
      "  npm run dig -- ../payments-service src/billing/charge.ts:8 --why --dry-run",
    ].join("\n"),
  );
  process.exit(2);
}

function fmtDate(iso: string): string {
  return iso.length >= 16 ? `${iso.slice(0, 10)} ${iso.slice(11, 16)}` : iso;
}

function indent(text: string, pad = "     "): string {
  return text
    .split("\n")
    .map((line) => pad + line)
    .join("\n");
}

function locStr(ev: Evidence): string {
  if (!ev.location) {
    const a = ev.anchor;
    return a ? `${a.kind} ${a.ref ?? a.id}` : "(unknown target)";
  }
  const { file, startLine, endLine } = ev.location;
  return endLine !== startLine ? `${file}:${startLine}-${endLine}` : `${file}:${startLine}`;
}

function printArtifact(a: Artifact, i: number, owns: boolean) {
  const who = a.author ? a.author.name + (a.author.email ? gray(` <${a.author.email}>`) : "") : "";
  const owner = owns ? mag("  ← currently owns this line") : "";

  console.log();
  console.log(
    `${bold(cyan(`Exhibit ${letter(i)}`))}  ${gray(a.id)}   ${gray(fmtDate(a.date))}${owner}`,
  );
  console.log(indent(bold(a.title)));
  if (who) console.log(indent(gray(who)));
  if (a.url) console.log(indent(gray(a.url)));

  const body = a.body.split("\n").slice(1).join("\n").trim();
  if (body) {
    console.log();
    console.log(indent(dim(body)));
  }
}

function printReport(ev: Evidence) {
  const repoName = ev.repo.name ?? ev.repo.path;
  const branch = ev.repo.branch ? gray(` · ${ev.repo.branch}`) : "";
  const n = ev.artifacts.length;
  const commits = ev.artifacts.filter((a) => a.kind === "commit").length;
  const extra = n - commits;
  const lastCommit = ev.artifacts.reduce((idx, a, i) => (a.kind === "commit" ? i : idx), -1);

  console.log();
  console.log(RULE);
  console.log(`${bold("UNDERSTORY")} ${gray("· evidence collection")}`);
  console.log(RULE);
  console.log(`${gray("Question:")} ${ev.question}`);
  console.log(`${gray("Repo:    ")} ${repoName}${branch}`);
  console.log(`${gray("Location:")} ${locStr(ev)}`);

  if (n === 0) {
    console.log();
    console.log(
      yellow("No commit in history touched this line.") +
        gray(" Nothing to reconstruct — the record is silent here."),
    );
    console.log(RULE);
    return;
  }

  console.log(
    `${gray("Evidence:")} ${green(String(commits))} commit${commits === 1 ? "" : "s"} shaped this line` +
      (extra > 0 ? gray(` · ${extra} PR/issue/review exhibit${extra === 1 ? "" : "s"}`) : "") +
      ` ${gray("(oldest first)")}`,
  );
  ev.artifacts.forEach((a, i) => printArtifact(a, i, i === lastCommit));

  console.log();
  console.log(RULE);
}

function levelColor(level: VerifiedNarrative["confidence"]["level"]) {
  return level === "high" ? green : level === "medium" ? yellow : red;
}

function printFindings(ev: Evidence, v: VerifiedNarrative) {
  const byId = new Map<string, { letter: string; title: string }>();
  ev.artifacts.forEach((a, i) => byId.set(a.id, { letter: letter(i), title: a.title }));

  console.log();
  console.log(`${bold("FINDINGS")} ${gray("· reconstructed conclusion")}`);
  console.log(RULE);
  console.log(
    v.recorded
      ? green("● Rationale reconstructed from the record")
      : yellow("○ History is silent — honest abstention (recorded = false)"),
  );
  console.log();
  console.log(indent(v.answer, "  "));
  console.log();

  const resolved = v.citations.filter((id) => byId.has(id));
  console.log(gray("Grounding:"));
  if (resolved.length === 0 && v.unknownCitations.length === 0) {
    console.log("  " + gray("no citations"));
  }
  for (const id of resolved) {
    const hit = byId.get(id)!;
    console.log(`  ${green("✓")} Exhibit ${hit.letter} · ${gray(id)} · ${hit.title}`);
  }
  for (const id of v.unknownCitations) {
    console.log(`  ${red("⚠")} ${red(id)} ${red("— FABRICATED: not in collected evidence")}`);
  }

  if (v.entailment?.checked) {
    console.log();
    console.log(
      gray("Substantiation:") + gray(" (does the cited source's own text back the claim?)"),
    );
    for (const check of v.entailment.checks) {
      const hit = byId.get(check.citation);
      const ex = hit ? `Exhibit ${hit.letter}` : check.citation;
      if (check.status === "supported" && check.quote) {
        console.log(`  ${green("✓")} ${ex} ${gray("·")} ${dim(`“${check.quote}”`)}`);
      } else if (check.status === "unsupported") {
        console.log(`  ${red("⚠")} ${ex} ${red("— source does not substantiate the claim")}`);
      } else {
        console.log(`  ${yellow("~")} ${ex} ${gray("— on topic, not stated in source")}`);
      }
    }
  }

  const c = v.confidence;
  const paint = levelColor(c.level);
  console.log();
  console.log(
    `${gray("Confidence:")} ${paint(bold(c.level.toUpperCase()))} ${paint(`${Math.round(c.score * 100)}%`)}` +
      gray(
        `   ${c.primarySources} primary · ${c.corroborating} corroborating · ${c.contradicting} contradicting`,
      ),
  );
  console.log(
    v.grounded
      ? dim("Every citation resolves to a real artifact — grounded.")
      : red(`✗ ${v.unknownCitations.length} fabricated citation(s) caught by verify.ts.`),
  );

  const prov = traceProvenance(ev);
  if (prov) {
    const label = [prov.pr, prov.commit]
      .filter((id): id is string => Boolean(id))
      .map((id) => ev.artifacts.find((a) => a.id === id))
      .filter((a): a is Artifact => Boolean(a))
      .map((a) => `${a.kind === "pull_request" ? "PR" : "commit"} ${a.ref ?? a.id}`)
      .join(" · ");
    console.log();
    console.log(`${gray("Origin:")} this line traces to ${cyan(label)}`);
  }

  const cosmetic = cosmeticOrigin(ev);
  if (cosmetic) {
    console.log();
    console.log(
      yellow(
        `Note: last touch ${cosmetic.ref ?? cosmetic.id} looks cosmetic — the original reason may be in an earlier commit.`,
      ),
    );
  }
  console.log(RULE);
}

function printDryRun(input: { system: string; prompt: string }) {
  console.log();
  console.log(
    `${bold("DRY RUN")} ${gray("· exactly what would be sent to the model — no API call")}`,
  );
  console.log(RULE);
  console.log(bold(cyan("SYSTEM ►")));
  console.log(indent(input.system, "  "));
  console.log();
  console.log(bold(cyan("PROMPT ►")));
  console.log(indent(input.prompt, "  "));
  console.log(RULE);
  console.log(
    dim("This is the entire context the model gets — no hidden knowledge, no outside data."),
  );
  console.log(RULE);
}

function keyMissing(): never {
  console.error();
  console.error(yellow("⚠ GROQ_API_KEY is not set."));
  console.error("  1. Get a FREE key (no card) at " + cyan("https://console.groq.com/keys"));
  console.error("  2. Put it in " + bold(".env.local") + ":  GROQ_API_KEY=gsk_...");
  console.error(gray("  (or preview the prompt without a key by adding --dry-run)"));
  process.exit(1);
}

async function main() {
  const raw = process.argv.slice(2);
  const json = raw.includes("--json");
  const why = raw.includes("--why");
  const dryRun = raw.includes("--dry-run");
  const args = raw.filter((a) => !a.startsWith("--"));
  const [repoPath, locationArg, ...rest] = args;

  if (!repoPath || !locationArg) usage();

  const location = parseLocation(locationArg);
  const question =
    rest.join(" ") ||
    (why
      ? "Why is this line the way it is? Reconstruct why it changed."
      : "(collection only — no question asked)");

  const evidence = await collect({ repoPath, question, location });

  if (why && dryRun) {
    const input = buildSynthesisInput(evidence);
    if (json) {
      console.log(JSON.stringify({ evidence, synthesisInput: input }, null, 2));
      return;
    }
    printReport(evidence);
    printDryRun(input);
    return;
  }

  let verified: VerifiedNarrative | undefined;
  if (why) {
    const model = getModel();
    if (!model) keyMissing();
    const narrative = await synthesize(evidence, model);
    const auditor = getAuditor() ?? { primary: model, fallback: null };
    const entailment = await checkEntailment(evidence, narrative, auditor).catch(() => undefined);
    verified = verify(evidence, narrative, entailment);
  }

  if (json) {
    console.log(JSON.stringify(verified ? { evidence, narrative: verified } : evidence, null, 2));
    return;
  }

  printReport(evidence);
  if (verified) printFindings(evidence, verified);
}

main().catch((err: unknown) => {
  console.error(bold(red("✗")), err instanceof Error ? err.message : String(err));
  process.exit(1);
});
