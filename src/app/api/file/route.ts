import { NextResponse } from "next/server";
import { isGitRepo, readFileAtHead } from "@/lib/collect/git";
import { getFileContentGitHub, getRepoMeta, parseGitHubRepo } from "@/lib/collect/github";
import { resolveRepoInput } from "@/lib/collect/resolve";
import { runWithToken } from "@/lib/collect/token-context";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(req: Request) {
  const limited = await rateLimit(req, "browse");
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const repo = searchParams.get("repo") ?? "";
  const filePath = searchParams.get("path") ?? "";
  if (!repo || !filePath) {
    return NextResponse.json({ error: "repo and path are required" }, { status: 400 });
  }

  const token = req.headers.get("x-github-token")?.trim() || undefined;

  return runWithToken(token, async () => {
    try {
      const gh = parseGitHubRepo(repo);
      if (gh) {
        const meta = await getRepoMeta(gh.owner, gh.repo);
        const content = await getFileContentGitHub(gh.owner, gh.repo, meta.branch, filePath);
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
  });
}
