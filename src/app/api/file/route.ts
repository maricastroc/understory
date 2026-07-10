import { NextResponse } from "next/server";
import { isGitRepo, readFileAtHead } from "@git-investigator/core/collect/git";
import {
  getFileContentGitHub,
  getRepoMeta,
  parseGitHubRepo,
} from "@git-investigator/core/collect/github";
import {
  getFileContentGitLab,
  getProjectMeta,
  parseGitLabRepo,
} from "@git-investigator/core/collect/gitlab";
import { sessionToken } from "@/lib/auth/current-user";
import { collectorAuthError, maybeDelegate } from "@/lib/collect/remote";
import { resolveRepoInput } from "@/lib/collect/resolve";
import { runWithTokens } from "@git-investigator/core/collect/token-context";
import { githubTokenForRepo } from "@/lib/github-app";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(req: Request) {
  const authError = collectorAuthError(req);
  if (authError) return authError;

  const limited = await rateLimit(req, "browse");
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const repo = searchParams.get("repo") ?? "";
  const filePath = searchParams.get("path") ?? "";
  if (!repo || !filePath) {
    return NextResponse.json({ error: "repo and path are required" }, { status: 400 });
  }

  const delegated = await maybeDelegate(req, repo);
  if (delegated) return delegated;

  const token = req.headers.get("x-github-token")?.trim() || (await sessionToken()) || undefined;
  const gitlabToken = req.headers.get("x-gitlab-token")?.trim() || undefined;

  return runWithTokens(
    { github: await githubTokenForRepo(token, repo), gitlab: gitlabToken },
    async () => {
      try {
        const gh = parseGitHubRepo(repo);
        if (gh) {
          const meta = await getRepoMeta(gh.owner, gh.repo);
          const content = await getFileContentGitHub(gh.owner, gh.repo, meta.branch, filePath);
          return NextResponse.json({ path: filePath, content });
        }

        const gl = parseGitLabRepo(repo);
        if (gl) {
          const meta = await getProjectMeta(gl.host, gl.project);
          const content = await getFileContentGitLab(gl.host, gl.project, meta.branch, filePath);
          return NextResponse.json({ path: filePath, content });
        }

        const { path } = await resolveRepoInput(repo);
        if (!(await isGitRepo(path))) {
          return NextResponse.json({ error: `Not a git repository: ${repo}` }, { status: 400 });
        }
        const content = await readFileAtHead(path, filePath);
        return NextResponse.json({ path: filePath, content });
      } catch (e) {
        return NextResponse.json(
          { error: e instanceof Error ? e.message : `Could not read ${filePath}` },
          { status: 404 },
        );
      }
    },
  );
}
