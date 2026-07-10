import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

export async function detectRemoteUrl(workspacePath: string): Promise<string | null> {
  try {
    const { stdout } = await exec("git", ["-C", workspacePath, "remote", "get-url", "origin"]);
    return normalizeRemote(stdout.trim());
  } catch {
    return null;
  }
}

function normalizeRemote(remote: string): string | null {
  // git@host:owner/repo(.git)  →  https://host/owner/repo
  let m = remote.match(/^[^@]+@([^:]+):(.+?)(?:\.git)?\/?$/);
  if (m) return `https://${m[1]}/${m[2]}`;
  // ssh://…, https://…, http://…  (optionally with user@)
  m = remote.match(/^(?:ssh|https?):\/\/(?:[^@/]+@)?([^/]+)\/(.+?)(?:\.git)?\/?$/);
  if (m) return `https://${m[1]}/${m[2]}`;
  return null;
}

export function buildWebUrl(
  webBase: string,
  repoUrl: string,
  relativeFile: string,
  line: number,
): string {
  const url = new URL(`${webBase.replace(/\/+$/, "")}/app`);
  url.searchParams.set("repo", repoUrl);
  url.searchParams.set("file", relativeFile);
  url.searchParams.set("line", String(line));
  return url.toString();
}
