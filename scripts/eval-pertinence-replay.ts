import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import {
  type ChangedFile,
  MAP_BUDGET,
  renderChangeMap,
  changeMap,
} from "@understory/core/collect/change-map";
import { getModel } from "@understory/core/llm";
import { partsOf } from "@understory/core/record-part";
import type { Artifact, Evidence } from "@understory/core/types";
import { APICallError, NoObjectGeneratedError, generateObject } from "ai";
import { parseControls, parseReplay } from "./eval-audit-claims";
import {
  type ChangeRecord,
  EXPECTATIONS,
  type Expectation,
  type Item,
  filesOf,
  itemsOf,
  lineAt,
  shaOf,
} from "./eval-pertinence";
import {
  PERTINENCE_SYSTEM,
  type PertinenceAnswer,
  type PertinenceInput,
  type Settled,
  pertinenceSchema,
  renderPertinence,
  settle,
} from "./eval-pertinence-prompt";
import { inputOf } from "./eval-pertinence-render";
import { clustersOf } from "./eval-pertinence-score";
import type { Snapshot } from "./eval-readings";
import { routeThroughOpenRouter, usageLines } from "./eval-route";

const RESULTS = "eval/results";
const EVIDENCE = `${RESULTS}/2026-10-14-reading-evidence.json`;
const REPLAY = `${RESULTS}/2026-10-12-patch-context-replay-one-question.jsonl`;
const CONTEXTS = `${RESULTS}/2026-10-21-pertinence-contexts.json`;
export const MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"] as const;
const PROBE_MODEL = MODELS[0];
const REPEAT = 3;
const OUTPUT_TOKENS = 900;
const CHARS_PER_TOKEN = 3.5;

export type Stage = "design" | "validation";

export type Input = {
  stage: Stage;
  cluster: string;
  id: string;
  kind: "borrowed" | "true" | "interpretive";
  group: string;
  label: Expectation | null;
  change: string;
  sentence: string;
  passages: Item["passages"];
  index: number;
};

export type Variant = {
  name: string;
  budget: number;
  sentence: boolean;
  models: readonly string[];
};

export type Call = {
  type: "call";
  stage: Stage;
  cluster: string;
  id: string;
  kind: Input["kind"];
  group: string;
  input: number;
  variant: string;
  budget: number;
  sentence: boolean;
  model: string;
  replay: number;
  cut: boolean;
  answer: PertinenceAnswer | null;
  error: string | null;
  raw: string | null;
  settled: Settled | "invalid answer";
  attempts: number;
  ms: number;
  tokens: { input: number; output: number };
  cost: number;
};

export const promptHash = () =>
  createHash("sha256").update(PERTINENCE_SYSTEM).digest("hex").slice(0, 12);

const kindOf = (label: Expectation | null): Input["kind"] =>
  !label || label.basis === "interpretive"
    ? "interpretive"
    : label.belongs === "the line's part"
      ? "true"
      : "borrowed";

export function designInputs(
  evidence: Map<string, Evidence>,
  expectations: Expectation[],
  records: ChangeRecord[],
): Input[] {
  const items = itemsOf(
    evidence,
    parseControls(readFileSync("eval/audit-controls.json", "utf8")),
    parseReplay(readFileSync(REPLAY, "utf8")).judgements,
    [],
    expectations,
  ).filter((i) => i.set === "controls");
  return clustersOf(items, records, expectations, 3).flatMap((c) =>
    c.inputs.map((input, index) => ({
      stage: "design" as const,
      cluster: c.key,
      id: c.id,
      kind: kindOf(c.label),
      group: "presented today",
      label: c.label,
      change: c.change,
      sentence: input.sentence,
      passages: input.passages,
      index,
    })),
  );
}

export function validationInputs(snapshot: Snapshot, expectations: Expectation[]): Input[] {
  const artifact = (id: string, source: string): Artifact | undefined => {
    const own = snapshot.cases.find((c) => c.id === id)?.evidence as Evidence | undefined;
    const repo = own?.repo.path;
    return (
      own?.artifacts.find((a) => a.id === source) ??
      snapshot.cases
        .map((c) => c.evidence as Evidence)
        .filter((e) => e.repo.path === repo)
        .flatMap((e) => e.artifacts)
        .find((a) => a.id === source)
    );
  };
  return expectations.flatMap((e) => {
    if (!e.validation) return [];
    const source = artifact(e.id, e.validation.passage.source);
    if (!source)
      throw new Error(`${e.id}: ${e.validation.passage.source} is not in the kept evidence`);
    return [
      {
        stage: "validation" as const,
        cluster: `validation | ${e.id} | ${e.text} | ${e.validation.change}`,
        id: e.id,
        kind: kindOf(e),
        group: e.validation.group,
        label: e,
        change: e.validation.change,
        sentence: e.text,
        passages: [
          {
            source: source.id,
            text: e.validation.passage.text,
            parts: partsOf(source, e.validation.passage.text),
          },
        ],
        index: 0,
      },
    ];
  });
}

export const VARIANTS: Variant[] = [
  { name: "main", budget: MAP_BUDGET, sentence: true, models: MODELS },
  { name: "budget 16000", budget: 16_000, sentence: true, models: [PROBE_MODEL] },
  { name: "budget 8000", budget: 8_000, sentence: true, models: [PROBE_MODEL] },
  { name: "no sentence", budget: MAP_BUDGET, sentence: false, models: [PROBE_MODEL] },
];

export type Planned = {
  input: Input;
  variant: Variant;
  model: string;
  request: PertinenceInput;
  cut: boolean;
};

export function plan(
  inputs: Input[],
  evidence: (id: string) => Evidence,
  files: (id: string, change: string) => ChangedFile[],
  kindOfSource: (id: string, source: string) => string,
): Planned[] {
  const planned: Planned[] = [];
  for (const input of inputs) {
    const ev = evidence(input.id);
    const changed = files(input.id, input.change);
    const line = lineAt(ev, input.change);
    if (!line) throw new Error(`${input.id}: the line at ${input.change} cannot be read`);
    const full = renderChangeMap(changeMap(changed, line, MAP_BUDGET));
    for (const variant of VARIANTS) {
      const map = changeMap(changed, line, variant.budget);
      if (variant.budget !== MAP_BUDGET && renderChangeMap(map) === full) continue;
      const request = inputOf(
        { change: input.change, claim: input.sentence, passages: input.passages },
        ev,
        changed,
        variant.budget,
      );
      if (!request) throw new Error(`${input.id}: no request for ${input.change}`);
      request.passages = request.passages.map((p) => ({
        ...p,
        kind: kindOfSource(input.id, p.source),
      }));
      if (!variant.sentence) request.sentence = null;
      for (const model of variant.models)
        planned.push({ input, variant, model, request, cut: !map.complete });
    }
  }
  return planned;
}

export function estimate(
  planned: Planned[],
  prices: Record<string, { input: number; output: number }>,
) {
  let cost = 0;
  let tokens = 0;
  for (const p of planned) {
    const input = (PERTINENCE_SYSTEM.length + renderPertinence(p.request).length) / CHARS_PER_TOKEN;
    tokens += input * REPEAT;
    cost += REPEAT * (input * prices[p.model].input + OUTPUT_TOKENS * prices[p.model].output);
  }
  return {
    calls: planned.length * REPEAT,
    inputTokens: Math.round(tokens),
    outputTokens: planned.length * REPEAT * OUTPUT_TOKENS,
    cost,
  };
}

async function groqPrices(): Promise<Record<string, { input: number; output: number }>> {
  const prices: Record<string, { input: number; output: number }> = {};
  for (const model of MODELS) {
    const reply = (await (
      await fetch(`https://openrouter.ai/api/v1/models/${model}/endpoints`)
    ).json()) as {
      data?: {
        endpoints?: Array<{
          provider_name: string;
          pricing: { prompt: string; completion: string };
        }>;
      };
    };
    const groq = reply.data?.endpoints?.find((e) => /groq/i.test(e.provider_name));
    if (!groq) throw new Error(`OpenRouter lists no Groq endpoint for ${model}`);
    prices[model] = { input: Number(groq.pricing.prompt), output: Number(groq.pricing.completion) };
  }
  return prices;
}

const spentIn = (file: string) =>
  readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as { type: string; cost?: number })
    .filter((r) => r.type === "call")
    .reduce((n, r) => n + (r.cost ?? 0), 0);

function args(argv: string[]) {
  const value = (flag: string) => {
    const at = argv.indexOf(flag);
    return at >= 0 ? argv[at + 1] : undefined;
  };
  return {
    stage: value("--stage") as Stage | undefined,
    out: value("--out"),
    cap: Number(value("--cap") ?? 1.5),
    after: argv.flatMap((a, i) => (argv[i - 1] === "--after" ? [a] : [])),
    dry: argv.includes("--estimate"),
  };
}

async function main() {
  const a = args(process.argv.slice(2));
  const stop = (message: string): never => {
    console.error(message);
    process.exit(1);
  };
  if (!a.stage || !["design", "validation"].includes(a.stage) || (!a.out && !a.dry))
    stop(
      "usage: npm run eval:pertinence-replay -- --stage design|validation --out <file.jsonl> [--after <earlier.jsonl>] [--cap 1.5] [--estimate]",
    );
  for (const file of [".env.local", ".env"]) if (existsSync(file)) process.loadEnvFile?.(file);
  const routerKey = process.env.OPEN_ROUTER_API_KEY;
  if (!a.dry && !routerKey)
    stop(
      "OPEN_ROUTER_API_KEY is needed: this replay runs only through OpenRouter, pinned to Groq.",
    );
  if (a.out && existsSync(a.out))
    stop(`"${a.out}" already holds a run. Kept runs are not overwritten.`);

  const snapshot = JSON.parse(readFileSync(EVIDENCE, "utf8")) as Snapshot;
  const evidence = new Map(snapshot.cases.map((c) => [c.id, c.evidence as Evidence]));
  const expectations = (
    JSON.parse(readFileSync(EXPECTATIONS, "utf8")) as { controls: Expectation[] }
  ).controls;
  const records = (JSON.parse(readFileSync(CONTEXTS, "utf8")) as { changes: ChangeRecord[] })
    .changes;
  const inputs =
    a.stage === "design"
      ? designInputs(evidence, expectations, records)
      : validationInputs(snapshot, expectations);

  const changed = new Map<string, ChangedFile[]>();
  for (const input of inputs) {
    const key = `${input.id}|${input.change}`;
    if (changed.has(key)) continue;
    const ev = evidence.get(input.id)!;
    changed.set(key, (await filesOf(ev, shaOf(ev, input.change)!)).files);
  }
  const kindOfSource = (id: string, source: string) => {
    const repo = evidence.get(id)?.repo.path;
    const found = snapshot.cases
      .map((c) => c.evidence as Evidence)
      .filter((e) => e.repo.path === repo)
      .flatMap((e) => e.artifacts)
      .find((x) => x.id === source);
    return found?.kind.replace("_", " ") ?? "source";
  };
  const planned = plan(
    inputs,
    (id) => evidence.get(id)!,
    (id, change) => changed.get(`${id}|${change}`)!,
    kindOfSource,
  );

  const prices = await groqPrices();
  const before = a.after.reduce((n, f) => n + spentIn(f), 0);
  const expected = estimate(planned, prices);
  console.log(
    `${a.stage}: ${inputs.length} inputs in ${new Set(inputs.map((i) => i.cluster)).size} clusters · ${expected.calls} calls · about ${expected.inputTokens} tokens in, ${expected.outputTokens} out · US$ ${expected.cost.toFixed(3)} estimated · US$ ${before.toFixed(3)} already spent · cap US$ ${a.cap.toFixed(2)}`,
  );
  for (const [model, p] of Object.entries(prices))
    console.log(
      `  ${model} on Groq: US$ ${(p.input * 1e6).toFixed(3)} in, US$ ${(p.output * 1e6).toFixed(3)} out, per million tokens`,
    );
  if (before + expected.cost > a.cap) stop("The estimate goes past the cap. Nothing was run.");
  if (a.dry) return;

  const route = routeThroughOpenRouter(routerKey!);
  globalThis.fetch = route.fetch;
  const out = a.out!;
  writeFileSync(
    out,
    `${JSON.stringify({
      type: "meta",
      kind: "pertinence-replay",
      stage: a.stage,
      date: new Date().toISOString(),
      commit: execFileSync("git", ["rev-parse", "--short", "HEAD"]).toString().trim(),
      prompt: promptHash(),
      models: MODELS,
      repeat: REPEAT,
      variants: VARIANTS.map((v) => ({
        name: v.name,
        budget: v.budget,
        sentence: v.sentence,
        models: v.models,
      })),
      via: "OpenRouter, pinned to Groq",
      prices,
      estimate: expected,
      cap: a.cap,
      spentBefore: before,
    })}\n`,
  );

  let spent = before;
  const spentNow = () => Object.values(route.usage()).reduce((n, u) => n + u.cost, 0);
  for (const p of planned)
    for (let replay = 0; replay < REPEAT; replay++) {
      if (spent >= a.cap) {
        appendFileSync(out, `${JSON.stringify({ type: "stopped", reason: "cap", spent })}\n`);
        console.log(`stopped at the cap: US$ ${spent.toFixed(4)}`);
        return;
      }
      const usageBefore = route.usage()[p.model] ?? { input: 0, output: 0, cost: 0 };
      const began = Date.now();
      let answer: Call["answer"] = null;
      let error: string | null = null;
      let raw: string | null = null;
      let attempts = 0;
      for (;;) {
        attempts++;
        try {
          const { object } = await generateObject({
            model: getModel({ model: p.model })!,
            schema: pertinenceSchema,
            system: PERTINENCE_SYSTEM,
            prompt: renderPertinence(p.request),
            temperature: 0,
            maxOutputTokens: 2_000,
            maxRetries: 0,
          });
          answer = object;
          error = null;
          raw = null;
          break;
        } catch (e) {
          error = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
          raw = NoObjectGeneratedError.isInstance(e) ? (e.text ?? null) : null;
          const transient =
            APICallError.isInstance(e) && (e.statusCode === 429 || (e.statusCode ?? 0) >= 500);
          if (!transient || attempts >= 3) break;
          await new Promise((r) => setTimeout(r, 2_000 * attempts));
        }
      }
      const usageAfter = route.usage()[p.model] ?? { input: 0, output: 0, cost: 0 };
      const cost = usageAfter.cost - usageBefore.cost;
      spent = before + spentNow();
      const map = p.request.map;
      const call: Call = {
        type: "call",
        stage: p.input.stage,
        cluster: p.input.cluster,
        id: p.input.id,
        kind: p.input.kind,
        group: p.input.group,
        input: p.input.index,
        variant: p.variant.name,
        budget: p.variant.budget,
        sentence: p.variant.sentence,
        model: p.model,
        replay,
        cut: p.cut,
        answer,
        error,
        raw,
        settled: answer ? settle(answer, map) : "invalid answer",
        attempts,
        ms: Date.now() - began,
        tokens: {
          input: usageAfter.input - usageBefore.input,
          output: usageAfter.output - usageBefore.output,
        },
        cost,
      };
      appendFileSync(out, `${JSON.stringify(call)}\n`);
      console.log(
        `${p.input.id} · ${p.variant.name} · ${p.model.replace("openai/", "")} · #${replay}: ${call.settled}${error ? ` (${error.slice(0, 80)})` : ""} · ${call.ms} ms · US$ ${cost.toFixed(5)}`,
      );
    }
  appendFileSync(out, `${JSON.stringify({ type: "usage", models: route.usage(), spent })}\n`);
  console.log(usageLines(route.usage()).join("\n"));
}

if (process.argv[1]?.endsWith("eval-pertinence-replay.ts")) void main();
