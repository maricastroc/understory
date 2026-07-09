import { type CollectInput, collect } from "./collect";
import { type LlmConfig, getModel } from "./llm";
import { synthesize } from "./synthesize";
import type { DigResult } from "./types";
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
    result.narrative = verify(evidence, await synthesize(evidence, model));
  } catch (e) {
    result.error = synthesisError(e);
  }
  return result;
}
