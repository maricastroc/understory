import { AsyncLocalStorage } from "node:async_hooks";

export type Tokens = { github?: string; gitlab?: string };

const store = new AsyncLocalStorage<Tokens>();

export function runWithTokens<T>(tokens: Tokens, fn: () => T): T {
  return store.run({ github: tokens.github || undefined, gitlab: tokens.gitlab || undefined }, fn);
}

export function runWithToken<T>(token: string | undefined, fn: () => T): T {
  return runWithTokens({ github: token }, fn);
}

export function getRequestToken(): string | undefined {
  return store.getStore()?.github;
}

export function resolveToken(): string | undefined {
  return getRequestToken() ?? process.env.GITHUB_TOKEN;
}

export function resolveGitLabToken(): string | undefined {
  return store.getStore()?.gitlab ?? process.env.GITLAB_TOKEN;
}
