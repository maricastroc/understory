import { createSign } from "node:crypto";
import { parseGitHubRepo } from "@git-investigator/core/collect/github";

const APP_ID = process.env.GITHUB_APP_ID;
const APP_SLUG = process.env.GITHUB_APP_SLUG;
const PRIVATE_KEY = process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, "\n");

export function githubAppConfigured(): boolean {
  return !!(APP_ID && PRIVATE_KEY);
}

export function installUrl(): string | null {
  return APP_SLUG ? `https://github.com/apps/${APP_SLUG}/installations/new` : null;
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

function appJwt(): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({ iat: now - 60, exp: now + 540, iss: APP_ID }));
  const data = `${header}.${payload}`;
  const signature = createSign("RSA-SHA256")
    .update(data)
    .sign(PRIVATE_KEY as string);
  return `${data}.${base64url(signature)}`;
}

function appHeaders(): Record<string, string> {
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    Authorization: `Bearer ${appJwt()}`,
  };
}

async function installationId(owner: string, repo: string): Promise<number | null> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/installation`, {
    headers: appHeaders(),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub App: installation lookup failed (${res.status})`);
  const data = (await res.json()) as { id: number };
  return data.id;
}

type Cached = { token: string; exp: number };
const cache = new Map<number, Cached>();

async function installationTokenForRepo(owner: string, repo: string): Promise<string | null> {
  if (!githubAppConfigured()) return null;

  const id = await installationId(owner, repo);
  if (id === null) return null;

  const now = Math.floor(Date.now() / 1000);
  const hit = cache.get(id);
  if (hit && hit.exp - 60 > now) return hit.token;

  const res = await fetch(`https://api.github.com/app/installations/${id}/access_tokens`, {
    method: "POST",
    headers: appHeaders(),
    body: JSON.stringify({ repositories: [repo] }),
  });
  if (!res.ok) throw new Error(`GitHub App: token minting failed (${res.status})`);

  const data = (await res.json()) as { token: string; expires_at: string };
  cache.set(id, { token: data.token, exp: Math.floor(new Date(data.expires_at).getTime() / 1000) });
  return data.token;
}

export async function githubTokenForRepo(
  userToken: string | undefined,
  repoSpec: string,
): Promise<string | undefined> {
  if (userToken) return userToken;
  if (!githubAppConfigured()) return undefined;

  const gh = parseGitHubRepo(repoSpec);
  if (!gh) return undefined;

  try {
    return (await installationTokenForRepo(gh.owner, gh.repo)) ?? undefined;
  } catch {
    return undefined;
  }
}
