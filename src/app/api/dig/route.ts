import { NextResponse } from "next/server";
import { anchorQuestion } from "@/lib/anchor-question";
import { type CollectInput, collect, parseLocation } from "@/lib/collect";
import { parseGitHubRepo } from "@/lib/collect/github";
import { resolveRepoInput } from "@/lib/collect/resolve";
import { runWithToken } from "@/lib/collect/token-context";
import { rateLimit } from "@/lib/ratelimit";
import { synthesize } from "@/lib/synthesize";
import { verify } from "@/lib/verify";
import type { ArtifactRef, DigResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const DEFAULT_LINE_QUESTION = "Why is this line the way it is? Reconstruct why it changed.";

export async function POST(req: Request) {
  const limited = await rateLimit(req, "ai");
  if (limited) return limited;

  let body: {
    repoPath?: string;
    location?: string;
    question?: string;
    target?: ArtifactRef;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { repoPath, location, question, target } = body;
  if (!repoPath || (!location && !target)) {
    return NextResponse.json(
      { error: "repoPath and either a location or a target are required" },
      { status: 400 },
    );
  }

  const token = req.headers.get("x-github-token")?.trim() || undefined;

  let collectArgs: Pick<CollectInput, "location" | "anchor" | "question">;
  try {
    collectArgs = target
      ? {
          anchor: target,
          question: question?.trim() || anchorQuestion[target.kind] || DEFAULT_LINE_QUESTION,
        }
      : {
          location: parseLocation(location!),
          question: question?.trim() || DEFAULT_LINE_QUESTION,
        };
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
      collect({ repoPath: collectPath, ...collectArgs }),
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
