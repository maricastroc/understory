import { synthesisError } from "../investigate";
import { type LlmConfig, getModel } from "../llm";
import type { Entailment } from "../types";
import { collectDiff } from "./collect";
import { checkDiffEntailment, diffEntailmentAffordable } from "./entail";
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
    const enabled = config.entail ?? process.env.ENTAILMENT !== "0";
    const forced = config.entail === true;
    const skippedForSize = enabled && !forced && !diffEntailmentAffordable(collection.clusters);
    const doEntail = enabled && !skippedForSize;
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
    const result = verifyDiff(collection, narrative, entailByRef, summaryEntailment);
    if (skippedForSize) {
      result.note = [
        result.note,
        "Entailment checks were skipped for this large pull request to stay within the model's rate limit — the citations and provenance chain are unaffected.",
      ]
        .filter(Boolean)
        .join(" ");
    }
    return result;
  } catch (e) {
    return collectionToResult(collection, synthesisError(e));
  }
}
