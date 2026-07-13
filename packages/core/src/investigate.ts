import { type CollectInput, collect } from "./collect";
import { checkEntailment } from "./entail";
import { type LlmConfig, getModel } from "./llm";
import { synthesize } from "./synthesize";
import type { DigResult, Entailment } from "./types";
import { verify } from "./verify";

const NO_LLM =
  "No language model is configured — showing the collected evidence and provenance only.";

export function synthesisError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  if (/rate.?limit|too large|tokens per minute|\bTPM\b|quota|\b429\b/i.test(raw)) {
    return "The write-up model is rate-limited for the moment — the evidence and provenance chain below are complete. Try the summary again in a minute.";
  }
  return "Could not generate the written summary — the collected evidence and provenance chain below still stand.";
}

export async function investigate(input: CollectInput, config: LlmConfig = {}): Promise<DigResult> {
  const evidence = await collect(input);
  const result: DigResult = { evidence, narrative: null };

  const model = getModel(config);
  if (!model) {
    result.error = NO_LLM;
    return result;
  }

  try {
    const narrative = await synthesize(evidence, model);
    const doEntail = config.entail ?? process.env.ENTAILMENT !== "0";
    let entailment: Entailment | undefined;
    if (doEntail) {
      // The judge is a best-effort second pass: if it's rate-limited or fails,
      // fall back to citation-existence grounding rather than losing the whole result.
      try {
        entailment = await checkEntailment(evidence, narrative, model);
      } catch {
        entailment = undefined;
      }
    }
    result.narrative = verify(evidence, narrative, entailment);
  } catch (e) {
    result.error = synthesisError(e);
  }
  return result;
}
