/** GET /api/file?repo=…&path=… — read a file's contents at HEAD, for the viewer. */
import { NextResponse } from "next/server";
import { isGitRepo, readFileAtHead } from "@/lib/collect/git";
import { resolveRepoInput } from "@/lib/collect/resolve";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const repo = searchParams.get("repo") ?? "";
  const filePath = searchParams.get("path") ?? "";
  if (!repo || !filePath) {
    return NextResponse.json({ error: "repo and path are required" }, { status: 400 });
  }

  try {
    const { path } = await resolveRepoInput(repo);
    if (!(await isGitRepo(path))) {
      return NextResponse.json({ error: `Not a git repository: ${repo}` }, { status: 400 });
    }
    const content = await readFileAtHead(path, filePath);
    return NextResponse.json({ path: filePath, content });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : `Could not read ${filePath}` }, { status: 404 });
  }
}
