import { resolveGitLabToken } from "../token-context";

export function gitlabApiBase(host: string): string {
  return `https://${host}/api/v4`;
}

export function projectId(project: string): string {
  return encodeURIComponent(project);
}

export function encodePath(filePath: string): string {
  return encodeURIComponent(filePath);
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/json" };
  const token = resolveGitLabToken();
  if (token) h["PRIVATE-TOKEN"] = token;
  return h;
}

function hint(status: number): string {
  if (status === 401 || status === 403)
    return " — unauthorized; the collector needs GITLAB_TOKEN set for this instance";
  if (status === 404) return " — not found; is the project path right and the token scoped to it?";
  if (status === 429) return " — rate limited by GitLab";
  return "";
}

export async function glRest<T>(host: string, path: string): Promise<T> {
  const res = await fetch(`${gitlabApiBase(host)}${path}`, { headers: headers() });
  if (!res.ok) throw new Error(`GitLab API ${res.status}${hint(res.status)}`);
  return (await res.json()) as T;
}

export async function glRestRaw(host: string, path: string): Promise<string> {
  const res = await fetch(`${gitlabApiBase(host)}${path}`, { headers: headers() });
  if (!res.ok) throw new Error(`GitLab API ${res.status}${hint(res.status)}`);
  return res.text();
}

export async function glRestPaged<T>(host: string, path: string, maxPages = 20): Promise<T[]> {
  const out: T[] = [];
  const sep = path.includes("?") ? "&" : "?";
  for (let page = 1; page <= maxPages; page++) {
    const res = await fetch(`${gitlabApiBase(host)}${path}${sep}per_page=100&page=${page}`, {
      headers: headers(),
    });
    if (!res.ok) throw new Error(`GitLab API ${res.status}${hint(res.status)}`);
    out.push(...((await res.json()) as T[]));
    if (!res.headers.get("x-next-page")) break;
  }
  return out;
}
