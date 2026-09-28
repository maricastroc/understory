import { type LlmConfig, type Model, getAuditFallbackModel, getAuditModel } from "./llm";

export type Auditor = { primary: Model; fallback: Model | null };

export function getAuditor(config: LlmConfig = {}): Auditor | null {
  const primary = getAuditModel(config);
  if (!primary) return null;
  const fallback = getAuditFallbackModel(config);
  return { primary, fallback: fallback && fallback.modelId !== primary.modelId ? fallback : null };
}

export async function runAudit<T>(
  auditor: Auditor,
  judge: (model: Model) => Promise<T>,
): Promise<{ value: T; fellBack: boolean }> {
  try {
    return { value: await judge(auditor.primary), fellBack: false };
  } catch (primaryError) {
    if (!auditor.fallback) throw primaryError;
    return { value: await judge(auditor.fallback), fellBack: true };
  }
}
