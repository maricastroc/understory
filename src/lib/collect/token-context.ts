import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Holds a per-request GitHub token so the collector can use a caller-supplied
 * PAT (for private repos) without threading it through every function. Scoped
 * to the async execution of one request — never leaks across concurrent ones.
 */
const store = new AsyncLocalStorage<string | undefined>();

export function runWithToken<T>(token: string | undefined, fn: () => T): T {
  return store.run(token || undefined, fn);
}

export function getRequestToken(): string | undefined {
  return store.getStore();
}

/** The token to authenticate GitHub calls with: caller-supplied PAT wins, else the server env token. */
export function resolveToken(): string | undefined {
  return getRequestToken() ?? process.env.GITHUB_TOKEN;
}
