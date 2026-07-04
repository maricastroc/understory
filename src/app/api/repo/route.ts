import { NextResponse } from "next/server";
import { isGitRepo, resolveRepo } from "@/lib/collect/git";
import { getRepoMeta, parseGitHubRepo } from "@/lib/collect/github";
import { resolveRepoInput } from "@/lib/collect/resolve";
import { runWithToken } from "@/lib/collect/token-context";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const token = req.headers.get("x-github-token")?.trim() || undefined;

  let body: { repo?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const repo = (body.repo ?? "").trim();
  if (!repo) return NextResponse.json({ error: "repo is required" }, { status: 400 });

  return runWithToken(token, async () => {
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
      return NextResponse.json(
        { error: e instanceof Error ? e.message : String(e) },
        { status: 400 },
      );
    }
  });
}
