import { createGroq } from "@ai-sdk/groq";

// Language of the written analysis only. "auto" = follow the question (line-level)
// or default to English (diff-level). Grounding/verification are language-agnostic.
export type Language = "auto" | "en" | "pt";

export type LlmConfig = {
  apiKey?: string;
  model?: string;
  entail?: boolean;
  language?: Language;
};

export function getModel(config: LlmConfig = {}) {
  const apiKey = config.apiKey ?? process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  const provider = createGroq({ apiKey });
  return provider(config.model ?? process.env.GROQ_MODEL ?? "openai/gpt-oss-120b");
}

export type Model = NonNullable<ReturnType<typeof getModel>>;
