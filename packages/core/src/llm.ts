import { createGroq } from "@ai-sdk/groq";

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
