import { groq } from "@ai-sdk/groq";

export const model = groq(process.env.GROQ_MODEL ?? "openai/gpt-oss-120b");
