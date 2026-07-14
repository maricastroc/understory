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
    let summaryEntailment: Entailment | undefined;
    if (doEntail) {
      try {
        const e = await checkDiffEntailment(collection.clusters, narrative, model);
        entailByRef = e.byRef;
        summaryEntailment = e.summary;
      } catch {
        entailByRef = undefined;
        summaryEntailment = undefined;
      }
    }
    return verifyDiff(collection, narrative, entailByRef, summaryEntailment);
  } catch (e) {
    return collectionToResult(collection, synthesisError(e));
  }
}
