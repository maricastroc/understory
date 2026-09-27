import { NextResponse } from "next/server";
import { isGitRepo } from "@git-investigator/core/collect/git";
import { getRepoMeta, parseGitHubRepo } from "@git-investigator/core/collect/github";
import {
  defaultFilesGitLab,
  getProjectMeta,
  parseGitLabRepo,
} from "@git-investigator/core/collect/gitlab";
import { overviewGitHub, overviewLocal } from "@git-investigator/core/collect/history/overview";
import { RECENT_COMMITS } from "@git-investigator/core/collect/rank";
import { runWithTokens } from "@git-investigator/core/collect/token-context";
import { sessionToken } from "@/lib/auth/current-user";
import { collectorAuthError, maybeDelegate } from "@/lib/collect/remote";
import { resolveRepoInput } from "@/lib/collect/resolve";
import { githubTokenForRepo } from "@/lib/github-app";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  const authError = collectorAuthError(req);
  if (authError) return authError;

  const limited = await rateLimit(req, "browse");
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const repo = searchParams.get("repo") ?? "";
  const cases = searchParams.getAll("case").filter(Boolean).slice(0, 20);
  if (!repo) return NextResponse.json({ error: "repo is required" }, { status: 400 });

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
          return NextResponse.json(await overviewGitHub(gh.owner, gh.repo, meta.branch, cases));
        }

        const gl = parseGitLabRepo(repo);
        if (gl) {
          const meta = await getProjectMeta(gl.host, gl.project);
          const files = await defaultFilesGitLab(gl.host, gl.project, meta.branch, 15);
          return NextResponse.json({
            head: null,
            total: files.length,
            truncated: false,
            shallow: false,
            mappable: false,
            prData: "none",
            recentCommits: RECENT_COMMITS,
            files: files.map((path) => ({
              path,
              blobSha: null,
              size: null,
              reason: "recent",
              churn: 0,
            })),
          });
        }

        const { path } = await resolveRepoInput(repo);
        if (!(await isGitRepo(path))) {
          return NextResponse.json({ error: `Not a git repository: ${repo}` }, { status: 400 });
        }
        return NextResponse.json(await overviewLocal(path, cases));
      } catch (e) {
        return NextResponse.json(
          { error: e instanceof Error ? e.message : String(e) },
          { status: 400 },
        );
      }
    },
  );
}
