import { createGroq } from "@ai-sdk/groq";

export type Language = "auto" | "en" | "pt";

export type LlmConfig = {
  apiKey?: string;
  model?: string;
  auditModel?: string;
  entail?: boolean;
  language?: Language;
};

const SYNTHESIS_MODEL = "openai/gpt-oss-120b";
// The entailment auditor is a narrower judge-and-quote task and makes most of the calls in an
// investigation (one synthesis, then ~8 audits). It runs on a smaller, faster, cheaper model from
// the SAME family as the synthesizer — a deliberate middle ground: about half the price and twice
// the throughput, without the quote-copying risk of dropping to a different, tiny model. Override
// with GROQ_AUDIT_MODEL (set it to the synthesis model to run everything on one).
const AUDIT_MODEL = "openai/gpt-oss-20b";
const AUDIT_FALLBACK_MODEL = "openai/gpt-oss-120b";

function provider(config: LlmConfig) {
  const apiKey = config.apiKey ?? process.env.GROQ_API_KEY;
  return apiKey ? createGroq({ apiKey }) : null;
}

export function getModel(config: LlmConfig = {}) {
  const p = provider(config);
  return p ? p(config.model ?? process.env.GROQ_MODEL ?? SYNTHESIS_MODEL) : null;
}

export function getAuditModel(config: LlmConfig = {}) {
  const p = provider(config);
  return p ? p(config.auditModel ?? process.env.GROQ_AUDIT_MODEL ?? AUDIT_MODEL) : null;
}

export function getAuditFallbackModel(config: LlmConfig = {}) {
  const p = provider(config);
  return p ? p(process.env.GROQ_AUDIT_FALLBACK_MODEL ?? AUDIT_FALLBACK_MODEL) : null;
}

export type Model = NonNullable<ReturnType<typeof getModel>>;
