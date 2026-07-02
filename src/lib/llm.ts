/**
 * The provider seam.
 *
 * The rest of the app never imports an LLM provider directly — it imports
 * `model` from here. Switching providers (Groq -> Claude -> Ollama -> ...) is a
 * one-line change in this file, and nothing else has to know.
 *
 * The Groq provider reads GROQ_API_KEY from the environment automatically
 * (loaded from .env.local by the CLI).
 */

import { groq } from "@ai-sdk/groq";

/**
 * The model synthesize() talks to. Change THIS line to change providers.
 * Groq free tier. gpt-oss-120b reasons well and supports structured outputs
 * (json_schema), which generateObject() needs. Note: not every Groq model does
 * — e.g. llama-3.3-70b-versatile does not, so it can't back generateObject.
 */
export const model = groq(process.env.GROQ_MODEL ?? "openai/gpt-oss-120b");

// --- Later, to use Claude (paid, higher-quality abstention) instead: --------
//   npm install @ai-sdk/anthropic         (set ANTHROPIC_API_KEY in .env.local)
//   import { anthropic } from "@ai-sdk/anthropic";
//   export const model = anthropic("claude-haiku-4-5-20251001");
