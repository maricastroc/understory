import { getAuditor } from "../auditor";
import { synthesisError } from "../investigate";
import { type LlmConfig, getModel } from "../llm";
import type { Entailment } from "../types";
import { collectDiff } from "./collect";
import { checkDiffEntailment, diffEntailmentAffordable, failedAuditChecks } from "./entail";
import { synthesizeDiff } from "./synthesize";
import type { DiffResult } from "./types";
import { collectionToResult, verifyDiff } from "./verify";

const NO_LLM = "No language model is configured — showing the collected evidence only.";

export type DiffInput = { owner: string; repo: string; number: number };

export function auditFailureNote(failed: number): string {
  return failed === 1
    ? "1 citation check could not run, so it is shown as unaudited."
    : `${failed} citation checks could not run, so they are shown as unaudited.`;
}

export async function investigateDiff(
  input: DiffInput,
  config: LlmConfig = {},
): Promise<DiffResult> {
  const collection = await collectDiff(input.owner, input.repo, input.number);

  const model = getModel(config);
  if (!model) return collectionToResult(collection, NO_LLM);
  const auditor = getAuditor(config) ?? { primary: model, fallback: null };

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
        const e = await checkDiffEntailment(collection.clusters, narrative, auditor);
        entailByRef = e.byRef;
        summaryEntailment = e.summary;
      } catch {
        entailByRef = undefined;
        summaryEntailment = undefined;
      }
    }
    const result = verifyDiff(collection, narrative, entailByRef, summaryEntailment);
    const failed = failedAuditChecks(entailByRef, summaryEntailment);
    const notes = [
      skippedForSize
        ? "Entailment checks were skipped for this large pull request to stay within the model's rate limit — the citations and provenance chain are unaffected."
        : null,
      failed > 0 ? auditFailureNote(failed) : null,
    ].filter((n): n is string => n !== null);
    if (notes.length > 0) result.note = [result.note, ...notes].filter(Boolean).join(" ");
    return result;
  } catch (e) {
    return collectionToResult(collection, synthesisError(e));
  }
}
