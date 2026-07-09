import { NextResponse } from "next/server";
import { defaultFiles, isGitRepo, searchFiles } from "@git-investigator/core/collect/git";
import {
  defaultFilesGitHub,
  getRepoMeta,
  parseGitHubRepo,
  searchFilesGitHub,
} from "@git-investigator/core/collect/github";
import {
  defaultFilesGitLab,
  getProjectMeta,
  parseGitLabRepo,
  searchFilesGitLab,
} from "@git-investigator/core/collect/gitlab";
import { collectorAuthError, maybeDelegate } from "@/lib/collect/remote";
import { resolveRepoInput } from "@/lib/collect/resolve";
import { runWithTokens } from "@git-investigator/core/collect/token-context";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(req: Request) {
  const authError = collectorAuthError(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const repo = searchParams.get("repo") ?? "";
  const q = searchParams.get("q") ?? "";
  if (!repo) return NextResponse.json({ error: "repo is required" }, { status: 400 });

  const delegated = await maybeDelegate(req, repo);
  if (delegated) return delegated;

  const token = req.headers.get("x-github-token")?.trim() || undefined;
  const gitlabToken = req.headers.get("x-gitlab-token")?.trim() || undefined;
  const isDefault = q.trim().length < 2;

  return runWithTokens({ github: token, gitlab: gitlabToken }, async () => {
    try {
      const gh = parseGitHubRepo(repo);
      if (gh) {
        const meta = await getRepoMeta(gh.owner, gh.repo);
        return NextResponse.json({
          files: isDefault
            ? await defaultFilesGitHub(gh.owner, gh.repo, meta.branch)
            : await searchFilesGitHub(gh.owner, gh.repo, meta.branch, q),
        });
      }

      const gl = parseGitLabRepo(repo);
      if (gl) {
        const meta = await getProjectMeta(gl.host, gl.project);
        return NextResponse.json({
          files: isDefault
            ? await defaultFilesGitLab(gl.host, gl.project, meta.branch)
            : await searchFilesGitLab(gl.host, gl.project, meta.branch, q),
        });
      }

      const { path } = await resolveRepoInput(repo);
      if (!(await isGitRepo(path))) {
        return NextResponse.json({ error: `Not a git repository: ${repo}` }, { status: 400 });
      }
      return NextResponse.json({
        files: isDefault ? await defaultFiles(path) : await searchFiles(path, q),
      });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : String(e) },
        { status: 400 },
      );
    }
  });
}
