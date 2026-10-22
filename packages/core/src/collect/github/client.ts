import { resolveToken } from "../token-context";

const API = "https://api.github.com";

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const token = resolveToken();
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

function isRateLimited(res: Response): boolean {
  if (res.status === 429) return true;
  if (res.status !== 403) return false;
  return res.headers.get("x-ratelimit-remaining") === "0" || res.headers.has("retry-after");
}

function hint(status: number, rateLimited: boolean): string {
  if (rateLimited) return " — rate limited; set GITHUB_TOKEN in .env.local for higher limits";
  if (status === 403) return " — refused; check that the token can read this repository";
  if (status === 404)
    return " — not found; is the repo public, or is GITHUB_TOKEN set for private access?";
  return "";
}

export class GitHubApiError extends Error {
  readonly status: number;
  readonly rateLimited: boolean;

  constructor(api: "API" | "GraphQL", res: Response) {
    const rateLimited = isRateLimited(res);
    super(`GitHub ${api} ${res.status}${hint(res.status, rateLimited)}`);
    this.name = "GitHubApiError";
    this.status = res.status;
    this.rateLimited = rateLimited;
  }
}

export async function rest<T>(path: string, opts: { signal?: AbortSignal } = {}): Promise<T> {
  const res = await fetch(
    `${API}${path}`,
    opts.signal ? { headers: headers(), signal: opts.signal } : { headers: headers() },
  );
  if (!res.ok) throw new GitHubApiError("API", res);
  return (await res.json()) as T;
}

export async function restRaw(path: string): Promise<string> {
  const res = await fetch(`${API}${path}`, {
    headers: { ...headers(), Accept: "application/vnd.github.raw" },
  });
  if (!res.ok) throw new GitHubApiError("API", res);
  return res.text();
}

export type GraphqlResult<T> = {
  data: T | null;
  errors: Array<{ message: string; path?: Array<string | number> }>;
};

export async function graphqlResult<T>(
  query: string,
  variables: Record<string, unknown>,
  opts: { attempts?: number; timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<GraphqlResult<T>> {
  if (!resolveToken()) {
    throw new Error(
      "Line-level history needs a GitHub token — set GITHUB_TOKEN (or add a token in the UI for private repos); blame uses the GraphQL API, which requires authentication.",
    );
  }

  const attempts = opts.attempts ?? 3;
  let lastError: Error = new Error("GitHub GraphQL request failed");

  const outer = opts.signal;
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 400 * attempt));
    if (outer?.aborted) throw new Error("GitHub GraphQL cancelled");
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 22_000);
    const cancel = () => ctrl.abort();
    outer?.addEventListener("abort", cancel, { once: true });
    try {
      const res = await fetch(`${API}/graphql`, {
        method: "POST",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables }),
        signal: ctrl.signal,
      });
      if (res.status >= 500) {
        lastError = new Error(`GitHub GraphQL ${res.status}`);
        continue;
      }
      if (!res.ok) throw new GitHubApiError("GraphQL", res);
      const json = (await res.json()) as GraphqlResult<T>;
      return { data: json.data ?? null, errors: json.errors ?? [] };
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      if (outer?.aborted) throw new Error("GitHub GraphQL cancelled");
      if (err.name === "AbortError") {
        lastError = new Error("GitHub GraphQL timeout");
        continue;
      }
      throw err;
    } finally {
      clearTimeout(timer);
      outer?.removeEventListener("abort", cancel);
    }
  }

  throw lastError;
}

export async function graphql<T>(
  query: string,
  variables: Record<string, unknown>,
  opts: { attempts?: number; signal?: AbortSignal } = {},
): Promise<T> {
  const { data, errors } = await graphqlResult<T>(query, variables, opts);
  if (errors.length) throw new Error(`GitHub GraphQL: ${errors[0].message}`);
  if (!data) throw new Error("GitHub GraphQL: empty response");
  return data;
}
