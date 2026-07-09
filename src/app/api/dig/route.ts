import { NextResponse } from "next/server";
import { anchorQuestion } from "@/lib/anchor-question";
import { captureQuestion } from "@/lib/capture";
import { type CollectInput, parseLocation } from "@/lib/collect";
import { parseGitHubRepo } from "@/lib/collect/github";
import { parseGitLabRepo } from "@/lib/collect/gitlab";
import { collectorAuthError, maybeDelegate } from "@/lib/collect/remote";
import { resolveRepoInput } from "@/lib/collect/resolve";
import { runWithTokens } from "@/lib/collect/token-context";
import { investigate } from "@/lib/investigate";
import { rateLimit } from "@/lib/ratelimit";
import type { ArtifactRef, DigResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const DEFAULT_LINE_QUESTION = "Why is this line the way it is? Reconstruct why it changed.";

export async function POST(req: Request) {
  const authError = collectorAuthError(req);
  if (authError) return authError;

  const limited = await rateLimit(req, "ai");
  if (limited) return limited;

  let body: {
    repoPath?: string;
    location?: string;
    question?: string;
    target?: ArtifactRef;
    noCapture?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { repoPath, location, question, target, noCapture } = body;
  if (!repoPath || (!location && !target)) {
    return NextResponse.json(
      { error: "repoPath and either a location or a target are required" },
      { status: 400 },
    );
  }

  const delegated = await maybeDelegate(req, repoPath, body);
  if (delegated) return delegated;

  const token = req.headers.get("x-github-token")?.trim() || undefined;
  const gitlabToken = req.headers.get("x-gitlab-token")?.trim() || undefined;

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

  if (!noCapture) {
    captureQuestion({
      question: collectArgs.question,
      repoPath,
      location: collectArgs.location ? location : undefined,
      anchorKind: target?.kind,
    });
  }

  let result: DigResult;
  try {
    const collectPath =
      parseGitHubRepo(repoPath) || parseGitLabRepo(repoPath)
        ? repoPath
        : (await resolveRepoInput(repoPath)).path;
    result = await runWithTokens({ github: token, gitlab: gitlabToken }, () =>
      investigate({ repoPath: collectPath, ...collectArgs }),
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 400 },
    );
  }

  return NextResponse.json(result);
}
