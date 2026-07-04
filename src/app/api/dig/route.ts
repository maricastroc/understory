import { NextResponse } from "next/server";
import { collect, parseLocation } from "@/lib/collect";
import { parseGitHubRepo } from "@/lib/collect/github";
import { resolveRepoInput } from "@/lib/collect/resolve";
import { runWithToken } from "@/lib/collect/token-context";
import { synthesize } from "@/lib/synthesize";
import { verify } from "@/lib/verify";
import type { DigResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  let body: { repoPath?: string; location?: string; question?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { repoPath, location, question } = body;
  if (!repoPath || !location) {
    return NextResponse.json({ error: "repoPath and location are required" }, { status: 400 });
  }

  const token = req.headers.get("x-github-token")?.trim() || undefined;

  let loc;
  try {
    loc = parseLocation(location);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 400 },
    );
  }

  let evidence;
  try {
    const collectPath = parseGitHubRepo(repoPath)
      ? repoPath
      : (await resolveRepoInput(repoPath)).path;
    evidence = await runWithToken(token, () =>
      collect({
        repoPath: collectPath,
        question: question?.trim() || "Why is this line the way it is? Reconstruct why it changed.",
        location: loc,
      }),
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 400 },
    );
  }

  const result: DigResult = { evidence, narrative: null };
  if (!process.env.GROQ_API_KEY) {
    result.error =
      "GROQ_API_KEY is not set on the server (.env.local) — showing collected evidence only.";
  } else {
    try {
      result.narrative = verify(evidence, await synthesize(evidence));
    } catch (e) {
      result.error = `Synthesis failed: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  return NextResponse.json(result);
}
