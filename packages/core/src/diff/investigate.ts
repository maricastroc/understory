import { synthesisError } from "../investigate";
import { type LlmConfig, getModel } from "../llm";
import { collectDiff } from "./collect";
import { synthesizeDiff } from "./synthesize";
import type { DiffResult } from "./types";
import { collectionToResult, verifyDiff } from "./verify";

const NO_LLM = "No language model is configured — showing the collected evidence only.";

export type DiffInput = { owner: string; repo: string; number: number };

// collect (deterministic) → synthesize (LLM) → verify (deterministic grounding).
// Degrades to evidence-only when there's no key or synthesis fails.
export async function investigateDiff(input: DiffInput, config: LlmConfig = {}): Promise<DiffResult> {
  const collection = await collectDiff(input.owner, input.repo, input.number);

  const model = getModel(config);
  if (!model) return collectionToResult(collection, NO_LLM);

  try {
    const narrative = await synthesizeDiff(collection, model, config.language);
    return verifyDiff(collection, narrative);
  } catch (e) {
    return collectionToResult(collection, synthesisError(e));
  }
}
