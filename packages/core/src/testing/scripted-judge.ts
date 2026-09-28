import { MockLanguageModelV4 } from "ai/test";

const USAGE = {
  inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 0, text: 0, reasoning: 0 },
};

export const TOOL_CALL_ERROR = "Tool choice is none, but model called a tool";

export function scriptedJudge(reply: (prompt: string) => object | Error): MockLanguageModelV4 {
  return new MockLanguageModelV4({
    doGenerate: async (options) => {
      const out = reply(JSON.stringify(options.prompt));
      if (out instanceof Error) throw out;
      return {
        content: [{ type: "text", text: JSON.stringify(out) }],
        finishReason: { unified: "stop", raw: "stop" },
        usage: USAGE,
        warnings: [],
      };
    },
  });
}

export const failingJudge = (): MockLanguageModelV4 =>
  scriptedJudge(() => new Error(TOOL_CALL_ERROR));
