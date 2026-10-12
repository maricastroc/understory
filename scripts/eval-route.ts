const GROQ = "https://api.groq.com/openai/v1/";
const OPENROUTER = "https://openrouter.ai/api/v1/";
const HOST = "groq";

export type ModelUsage = { calls: number; input: number; output: number; cost: number };
export type Usage = Record<string, ModelUsage>;

export function rerouted(url: string): string | null {
  return url.startsWith(GROQ) ? OPENROUTER + url.slice(GROQ.length) : null;
}

export function pinned(body: string): string {
  return JSON.stringify({
    ...JSON.parse(body),
    provider: { only: [HOST], allow_fallbacks: false },
  });
}

type Reply = {
  model?: string;
  provider?: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number };
};

export function tallied(usage: Usage, requested: string, reply: Reply): Usage {
  const before = usage[requested] ?? { calls: 0, input: 0, output: 0, cost: 0 };
  return {
    ...usage,
    [requested]: {
      calls: before.calls + 1,
      input: before.input + (reply.usage?.prompt_tokens ?? 0),
      output: before.output + (reply.usage?.completion_tokens ?? 0),
      cost: before.cost + (reply.usage?.cost ?? 0),
    },
  };
}

const urlOf = (input: RequestInfo | URL): string =>
  typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

export function routeThroughOpenRouter(
  apiKey: string,
  inner: typeof fetch = globalThis.fetch,
): { fetch: typeof fetch; usage: () => Usage } {
  let usage: Usage = {};
  const routed: typeof fetch = async (input, init) => {
    const target = rerouted(urlOf(input));
    if (!target || typeof init?.body !== "string") return inner(input, init);
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${apiKey}`);
    const response = await inner(target, { ...init, headers, body: pinned(init.body) });
    if (!response.ok) return response;
    const reply = (await response
      .clone()
      .json()
      .catch(() => ({}))) as Reply;
    if (reply.provider && reply.provider.toLowerCase() !== HOST)
      throw new Error(`OpenRouter answered through ${reply.provider}, not Groq`);
    usage = tallied(usage, String(JSON.parse(init.body).model ?? "unknown"), reply);
    return response;
  };
  return { fetch: routed, usage: () => usage };
}

export function usageLines(usage: Usage): string[] {
  const models = Object.entries(usage);
  if (models.length === 0) return [];
  const cost = models.reduce((sum, [, u]) => sum + u.cost, 0);
  return [
    ...models.map(
      ([model, u]) =>
        `${model}: ${u.calls} calls · ${u.input} tokens in · ${u.output} out · US$ ${u.cost.toFixed(4)}`,
    ),
    `total: US$ ${cost.toFixed(4)}`,
  ];
}
