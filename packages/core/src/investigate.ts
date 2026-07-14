import { type CollectInput, collect } from "./collect";
import { checkEntailment } from "./entail";
import { type LlmConfig, getModel } from "./llm";
import { synthesize } from "./synthesize";
import type { DigResult, Entailment, Evidence, VerifiedNarrative } from "./types";
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

export async function narrate(
  evidence: Evidence,
  config: LlmConfig = {},
): Promise<{ narrative: VerifiedNarrative | null; error?: string }> {
  const model = getModel(config);
  if (!model) return { narrative: null, error: NO_LLM };

  try {
    const narrative = await synthesize(evidence, model, config.language);
    const doEntail = config.entail ?? process.env.ENTAILMENT !== "0";
    let entailment: Entailment | undefined;
    if (doEntail) {
      try {
        entailment = await checkEntailment(evidence, narrative, model);
      } catch {
        entailment = undefined;
      }
    }
    return { narrative: verify(evidence, narrative, entailment) };
  } catch (e) {
    return { narrative: null, error: synthesisError(e) };
  }
}

export async function investigate(input: CollectInput, config: LlmConfig = {}): Promise<DigResult> {
  const evidence = await collect(input);
  const { narrative, error } = await narrate(evidence, config);
  return { evidence, narrative, ...(error ? { error } : {}) };
}
