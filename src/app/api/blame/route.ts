import { NextResponse } from "next/server";
import { blameWindow } from "@git-investigator/core/collect/blame-window";
import { parseGitHubRepo } from "@git-investigator/core/collect/github";
import { parseGitLabRepo } from "@git-investigator/core/collect/gitlab";
import { runWithTokens } from "@git-investigator/core/collect/token-context";
import { sessionToken } from "@/lib/auth/current-user";
import { parseBlameQuery } from "@/lib/blame-query";
import { collectorAuthError, maybeDelegate } from "@/lib/collect/remote";
import { resolveRepoInput } from "@/lib/collect/resolve";
import { githubTokenForRepo } from "@/lib/github-app";
import { ensureHistoryStore } from "@/lib/history-store";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  const authError = collectorAuthError(req);
  if (authError) return authError;

  const limited = await rateLimit(req, "browse");
  if (limited) return limited;

  ensureHistoryStore();

  const parsed = parseBlameQuery(new URL(req.url).searchParams);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { repo, path, ref, start, end } = parsed;

  const delegated = await maybeDelegate(req, repo);
  if (delegated) return delegated;

  const token = req.headers.get("x-github-token")?.trim() || (await sessionToken()) || undefined;
  const gitlabToken = req.headers.get("x-gitlab-token")?.trim() || undefined;

  return runWithTokens(
    { github: await githubTokenForRepo(token, repo), gitlab: gitlabToken },
    async () => {
      try {
        const repoPath =
          parseGitHubRepo(repo) || parseGitLabRepo(repo)
            ? repo
            : (await resolveRepoInput(repo)).path;
        const spans = await blameWindow({ repoPath, file: path, ref, start, end });
        return NextResponse.json({ path, ref, spans });
      } catch (e) {
        return NextResponse.json(
          { error: e instanceof Error ? e.message : `Could not blame ${path}` },
          { status: 404 },
        );
      }
    },
  );
}
