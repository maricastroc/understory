import { synthesisError } from "../investigate";
import { type LlmConfig, getModel } from "../llm";
import type { Entailment } from "../types";
import { collectDiff } from "./collect";
import { checkDiffEntailment } from "./entail";
import { synthesizeDiff } from "./synthesize";
import type { DiffResult } from "./types";
import { collectionToResult, verifyDiff } from "./verify";

const NO_LLM = "No language model is configured — showing the collected evidence only.";

export type DiffInput = { owner: string; repo: string; number: number };

// collect (deterministic) → synthesize (LLM) → entail (LLM, best-effort) → verify
// (deterministic grounding). Step for step the same pipeline as the line flow's
// investigate(); degrades to evidence-only when there's no key or synthesis fails.
export async function investigateDiff(
  input: DiffInput,
  config: LlmConfig = {},
): Promise<DiffResult> {
  const collection = await collectDiff(input.owner, input.repo, input.number);

  const model = getModel(config);
  if (!model) return collectionToResult(collection, NO_LLM);

  try {
    const narrative = await synthesizeDiff(collection, model, config.language);
    const doEntail = config.entail ?? process.env.ENTAILMENT !== "0";
    let entailByRef: Map<string, Entailment> | undefined;
    if (doEntail) {
      // Best-effort second pass: if the judge is rate-limited or fails, fall back to
      // citation-existence grounding rather than losing the whole result.
      try {
        entailByRef = await checkDiffEntailment(collection.clusters, narrative, model);
      } catch {
        entailByRef = undefined;
      }
    }
    return verifyDiff(collection, narrative, entailByRef);
  } catch (e) {
    return collectionToResult(collection, synthesisError(e));
  }
}
