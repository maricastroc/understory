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

function hint(status: number): string {
  if (status === 403 || status === 429)
    return " — rate limited; set GITHUB_TOKEN in .env.local for higher limits";
  if (status === 404)
    return " — not found; is the repo public, or is GITHUB_TOKEN set for private access?";
  return "";
}

export async function rest<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: headers() });
  if (!res.ok) throw new Error(`GitHub API ${res.status}${hint(res.status)}`);
  return (await res.json()) as T;
}

export async function restRaw(path: string): Promise<string> {
  const res = await fetch(`${API}${path}`, {
    headers: { ...headers(), Accept: "application/vnd.github.raw" },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}${hint(res.status)}`);
  return res.text();
}

export async function restDiff(path: string): Promise<string> {
  const res = await fetch(`${API}${path}`, {
    headers: { ...headers(), Accept: "application/vnd.github.diff" },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}${hint(res.status)}`);
  return res.text();
}

export async function graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  if (!resolveToken()) {
    throw new Error(
      "Line-level history needs a GitHub token — set GITHUB_TOKEN (or add a token in the UI for private repos); blame uses the GraphQL API, which requires authentication.",
    );
  }

  let lastError: Error = new Error("GitHub GraphQL request failed");

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 400 * attempt));
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 22_000);
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
      if (!res.ok) throw new Error(`GitHub GraphQL ${res.status}`);
      const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
      if (json.errors?.length) throw new Error(`GitHub GraphQL: ${json.errors[0].message}`);
      if (!json.data) throw new Error("GitHub GraphQL: empty response");
      return json.data;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      if (err.name === "AbortError") {
        lastError = new Error("GitHub GraphQL timeout");
        continue;
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError;
}
