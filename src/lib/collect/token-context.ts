import { AsyncLocalStorage } from "node:async_hooks";

const store = new AsyncLocalStorage<string | undefined>();

export function runWithToken<T>(token: string | undefined, fn: () => T): T {
  return store.run(token || undefined, fn);
}

export function getRequestToken(): string | undefined {
  return store.getStore();
}

export function resolveToken(): string | undefined {
  return getRequestToken() ?? process.env.GITHUB_TOKEN;
}
