import { readFileSync } from "node:fs";
import { generateObject } from "ai";
import { z } from "zod";
import { anchorQuestion } from "../src/lib/anchor-question";

const proc = process as NodeJS.Process & { loadEnvFile?: (path?: string) => void };
try {
  proc.loadEnvFile?.(".env.local");
} catch {
  /* env may be provided some other way */
}

const color = process.stdout.isTTY && !process.env.NO_COLOR;
const wrap = (code: string) => (s: string) => (color ? `\x1b[${code}m${s}\x1b[0m` : s);
const bold = wrap("1");
const red = wrap("31");
const green = wrap("32");
const yellow = wrap("33");
const cyan = wrap("36");
const gray = wrap("90");
const RULE = gray("─".repeat(66));

/**
 * Hypothesis to validate — NOT the final taxonomy. It stays in this throwaway
 * script on purpose: nothing graduates to the type system until the data earns
 * it. `other` + a free-form label exist so a question that fits none of these
 * is surfaced, never force-fit.
 */
const BUCKETS = [
  [
    "provenance",
    "who/when/which commit introduced or last changed this — its origin and authorship",
  ],
  ["rationale", "the reasoning or motivation for why it is the way it is — the decision behind it"],
  ["evolution", "how it changed over time — what it used to be, the sequence of modifications"],
  ["safety", "whether it is safe to change or remove — what depends on it, the blast radius"],
  ["association", "what issue, PR, ticket, incident or discussion this ties back to"],
] as const;

type Intent = (typeof BUCKETS)[number][0] | "other";

const schema = z.object({
  intent: z.enum(["provenance", "rationale", "evolution", "safety", "association", "other"]),
  label: z.string().describe("2-4 words naming what the developer actually wants to know"),
  confidence: z
    .enum(["high", "medium", "low"])
    .describe(
      "how cleanly the question maps to a single intent — low if it is vague or spans several",
    ),
});

const SYSTEM = [
  "You label a developer's question about a specific line or region of code by the",
  "INVESTIGATIVE INTENT behind it: what kind of answer from the git/GitHub history they",
  "are actually after. Classify into exactly one bucket:",
  "",
  ...BUCKETS.map(([name, desc]) => `- ${name}: ${desc}`),
  "- other: none of the above fit. Use this freely — do NOT stretch a question to fit a",
  "  bucket. When you pick other, make `label` a precise name for the real intent.",
  "",
  "Also set `confidence`: high if it maps cleanly to one bucket, low if it is vague or",
  "genuinely spans several. Be honest — low confidence is a useful signal, not a failure.",
].join("\n");

type Classified = {
  question: string;
  count: number;
  intent: Intent;
  label: string;
  confidence: string;
};
type Model = Parameters<typeof generateObject>[0]["model"];

async function classify(
  question: string,
  model: Model,
): Promise<Omit<Classified, "question" | "count">> {
  try {
    const { object } = await generateObject({
      model,
      schema,
      system: SYSTEM,
      prompt: `Question: ${question}`,
      temperature: 0,
    });
    return object;
  } catch {
    return { intent: "other", label: "unclassified (error)", confidence: "low" };
  }
}

function bar(pct: number, width = 24): string {
  return "█".repeat(Math.round((pct / 100) * width)).padEnd(width, "·");
}

function keyMissing(): never {
  console.error(yellow("\n⚠ GROQ_API_KEY is not set (.env.local) — needed to classify questions."));
  console.error("  Free key (no card): " + cyan("https://console.groq.com/keys"));
  process.exit(1);
}

function readQuestionsFromFile(path: string): string[] {
  const raw: unknown = JSON.parse(readFileSync(path, "utf8"));
  const items: unknown[] = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { cases?: unknown }).cases)
      ? (raw as { cases: unknown[] }).cases
      : [];
  return items
    .map((x) =>
      typeof x === "string"
        ? x
        : x && typeof x === "object" && "question" in x
          ? String((x as { question: unknown }).question)
          : "",
    )
    .filter((q) => q.trim().length > 0);
}

async function main() {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const limitArg = Number(args[args.indexOf("--limit") + 1]);
  const limit = args.includes("--limit") && limitArg > 0 ? limitArg : Infinity;
  const samplesArg = Number(args[args.indexOf("--samples") + 1]);
  const samples = args.includes("--samples") && samplesArg >= 0 ? samplesArg : 3;

  const from = args.includes("--from") ? args[args.indexOf("--from") + 1] : null;

  if (!process.env.GROQ_API_KEY) keyMissing();

  let disconnect: () => Promise<void> = () => Promise.resolve();
  let rawQuestions: string[];
  let totalRows: number;
  if (from) {
    rawQuestions = readQuestionsFromFile(from);
    totalRows = rawQuestions.length;
  } else {
    // db.ts reads DATABASE_URL at module init, so import it only after loadEnvFile ran.
    const { prisma, dbEnabled } = await import("../src/lib/db");
    if (!dbEnabled || !prisma) {
      console.error(red("\n✗ DATABASE_URL is not set — nothing to mine (no captured questions)."));
      process.exit(1);
    }
    const rows = await prisma.questionLog.findMany({ select: { question: true } });
    rawQuestions = rows.map((r) => r.question);
    totalRows = rows.length;
    disconnect = () => prisma.$disconnect();
  }

  const canonical = new Set(Object.values(anchorQuestion));
  const placeholders = /^\(collection only|^why is this line the way it is\?/i;

  const counts = new Map<string, number>();
  let excludedCanonical = 0;
  for (const question of rawQuestions) {
    const q = question.trim();
    if (!q || placeholders.test(q)) continue;
    if (canonical.has(q)) {
      excludedCanonical++;
      continue;
    }
    counts.set(q, (counts.get(q) ?? 0) + 1);
  }

  const unique = [...counts.entries()]
    .map(([question, count]) => ({ question, count }))
    .slice(0, limit === Infinity ? undefined : limit);

  if (unique.length === 0) {
    console.error(
      yellow("\nNo free-text questions to mine yet.") +
        gray(` (${totalRows} rows, ${excludedCanonical} canonical drill-downs excluded)`),
    );
    process.exit(0);
  }

  // llm.ts resolves GROQ_MODEL at import init too, so load it after loadEnvFile.
  const { model } = await import("../src/lib/llm");
  const classified: Classified[] = [];
  for (let i = 0; i < unique.length; i++) {
    if (!json) process.stdout.write(gray(`\r  classifying ${i + 1}/${unique.length}…`));
    const c = await classify(unique[i].question, model);
    classified.push({ ...unique[i], ...c });
  }
  if (!json) process.stdout.write("\r".padEnd(40) + "\r");

  const weight = (pred: (c: Classified) => boolean) =>
    classified.filter(pred).reduce((n, c) => n + c.count, 0);
  const total = classified.reduce((n, c) => n + c.count, 0);

  if (json) {
    console.log(JSON.stringify({ total, excludedCanonical, classified }, null, 2));
    return;
  }

  const order: Intent[] = [...BUCKETS.map(([n]) => n as Intent), "other"];
  const dist = order
    .map((intent) => ({ intent, n: weight((c) => c.intent === intent) }))
    .filter((d) => d.n > 0)
    .sort((a, b) => b.n - a.n);

  console.log();
  console.log(RULE);
  console.log(
    `${bold("INTENT MINING")} ${gray("· Phase 0 — validate the taxonomy from real questions")}`,
  );
  console.log(RULE);
  console.log(
    `${gray("Sample:")} ${bold(String(total))} free-text question${total === 1 ? "" : "s"}` +
      gray(` (${unique.length} unique · ${excludedCanonical} canonical drill-downs excluded)`),
  );
  if (from) {
    console.log(gray(`Source: ${from} — mechanism check, not a usage signal.`));
  }
  if (unique.length < 20) {
    console.log(
      yellow("⚠ Small sample — treat everything below as a preliminary signal, not a verdict."),
    );
  }

  console.log();
  console.log(bold("Distribution"));
  for (const { intent, n } of dist) {
    const pct = (n / total) * 100;
    const paint = intent === "other" ? yellow : cyan;
    console.log(
      `  ${paint(intent.padEnd(12))} ${gray(bar(pct))} ${String(Math.round(pct)).padStart(3)}% ${gray(`(${n})`)}`,
    );
  }

  const conf = (level: string) => Math.round((weight((c) => c.confidence === level) / total) * 100);
  console.log();
  console.log(bold("Classification confidence") + gray("  — the menu-vs-inference signal"));
  console.log(
    `  ${green("high")} ${conf("high")}%   ${yellow("medium")} ${conf("medium")}%   ${red("low")} ${conf("low")}%`,
  );

  const otherPile = classified.filter((c) => c.intent === "other");
  if (otherPile.length) {
    const labels = new Map<string, number>();
    for (const c of otherPile) labels.set(c.label, (labels.get(c.label) ?? 0) + c.count);
    console.log();
    console.log(bold("Fell outside the taxonomy") + gray("  — candidate missing buckets"));
    for (const [label, n] of [...labels.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${yellow("•")} ${label} ${gray(`(${n})`)}`);
    }
  }

  if (samples > 0) {
    console.log();
    console.log(bold("Samples"));
    for (const { intent } of dist) {
      const ex = classified.filter((c) => c.intent === intent).slice(0, samples);
      console.log(`  ${cyan(intent)}`);
      for (const c of ex) console.log(`    ${gray("›")} ${c.question}`);
    }
  }

  const coverage = Math.round((1 - weight((c) => c.intent === "other") / total) * 100);
  const clarity = conf("high");
  console.log();
  console.log(RULE);
  console.log(bold("Reading the result"));
  console.log(
    `  ${gray("Coverage:")} ${coverage}% of questions fit the 5 candidate buckets.` +
      (coverage < 80
        ? yellow("  → the taxonomy is likely missing a bucket (see above).")
        : gray("")),
  );
  console.log(
    `  ${gray("Clarity: ")} ${clarity}% classified with high confidence.` +
      (clarity >= 75
        ? green("  → inferring intent from free text is viable; a menu is optional polish.")
        : yellow("  → real ambiguity exists; a menu earns its place.")),
  );
  console.log(RULE);
  await disconnect();
}

main().catch((err: unknown) => {
  console.error(bold(red("\n✗")), err instanceof Error ? err.message : String(err));
  process.exit(1);
});
