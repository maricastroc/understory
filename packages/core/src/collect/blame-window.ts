import type { BlameSpan } from "../types";
import { MAX_BLAME_WINDOW } from "./blame-limits";
import { blameWindowLocal, isGitRepo } from "./git";
import { blameWindowGitHub, parseGitHubRepo } from "./github";
import { blameWindowGitLab, parseGitLabRepo } from "./gitlab";
import { isCommitSha } from "./sha";

export { MAX_BLAME_WINDOW };

export async function blameWindow(input: {
  repoPath: string;
  file: string;
  ref: string;
  start: number;
  end: number;
}): Promise<BlameSpan[]> {
  const { repoPath, file, ref, start, end } = input;
  if (!isCommitSha(ref)) throw new Error(`Not a commit sha: ${ref}`);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) {
    throw new Error(`Bad line window ${start}-${end}`);
  }
  if (end - start + 1 > MAX_BLAME_WINDOW) {
    throw new Error(`Blame window is limited to ${MAX_BLAME_WINDOW} lines`);
  }

  const gh = parseGitHubRepo(repoPath);
  if (gh) return blameWindowGitHub(gh.owner, gh.repo, ref, file, start, end);

  const gl = parseGitLabRepo(repoPath);
  if (gl) return blameWindowGitLab(gl.host, gl.project, ref, file, start, end);

  if (!(await isGitRepo(repoPath))) throw new Error(`Not a git repository: ${repoPath}`);
  return blameWindowLocal(repoPath, ref, file, start, end);
}
