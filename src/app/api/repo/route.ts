import { NextResponse } from "next/server";
import { isGitRepo, resolveRepo } from "@git-investigator/core/collect/git";
import { getRepoMeta, parseGitHubRepo } from "@git-investigator/core/collect/github";
import { getProjectMeta, parseGitLabRepo } from "@git-investigator/core/collect/gitlab";
import { collectorAuthError, maybeDelegate } from "@/lib/collect/remote";
import { resolveRepoInput } from "@/lib/collect/resolve";
import { runWithTokens } from "@git-investigator/core/collect/token-context";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const authError = collectorAuthError(req);
  if (authError) return authError;

  const limited = await rateLimit(req, "browse");
  if (limited) return limited;

  const token = req.headers.get("x-github-token")?.trim() || undefined;
  const gitlabToken = req.headers.get("x-gitlab-token")?.trim() || undefined;

  let body: { repo?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const repo = (body.repo ?? "").trim();
  if (!repo) return NextResponse.json({ error: "repo is required" }, { status: 400 });

  const delegated = await maybeDelegate(req, repo, body);
  if (delegated) return delegated;

  return runWithTokens({ github: token, gitlab: gitlabToken }, async () => {
    try {
      const gh = parseGitHubRepo(repo);
      if (gh) {
        const meta = await getRepoMeta(gh.owner, gh.repo);
        return NextResponse.json({
          ready: true,
          kind: "github",
          name: meta.name,
          branch: meta.branch,
          htmlUrl: meta.htmlUrl,
          private: meta.private,
          description: meta.description,
          language: meta.language,
          stars: meta.stars,
          forks: meta.forks,
          openIssues: meta.openIssues,
          pushedAt: meta.pushedAt,
          topics: meta.topics,
        });
      }

      const gl = parseGitLabRepo(repo);
      if (gl) {
        const meta = await getProjectMeta(gl.host, gl.project);
        return NextResponse.json({
          ready: true,
          kind: "gitlab",
          name: meta.name,
          branch: meta.branch,
          htmlUrl: meta.htmlUrl,
          private: meta.private,
          description: meta.description,
          language: meta.language,
          stars: meta.stars,
          forks: meta.forks,
          openIssues: meta.openIssues,
          pushedAt: meta.pushedAt,
          topics: meta.topics,
        });
      }

      if (/^https?:\/\/github\.com\//i.test(repo)) {
        return NextResponse.json(
          {
            error: `"${repo}" points to a GitHub user or org, not a repository. Use a full repo URL like https://github.com/owner/repo (or the shorthand owner/repo).`,
          },
          { status: 400 },
        );
      }

      const resolved = await resolveRepoInput(repo);
      if (!(await isGitRepo(resolved.path))) {
        return NextResponse.json({ error: `Not a git repository: ${repo}` }, { status: 400 });
      }
      const ref = await resolveRepo(resolved.path);
      return NextResponse.json({
        ready: true,
        kind: resolved.kind,
        name: ref.name ?? resolved.slug ?? repo,
        branch: ref.branch ?? null,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const friendly = /\bENOENT\b/.test(msg)
        ? "Git isn't available in this environment, so only GitHub repos work here. Use owner/repo or a full https://github.com/owner/repo URL."
        : msg;
      return NextResponse.json({ error: friendly }, { status: 400 });
    }
  });
}
