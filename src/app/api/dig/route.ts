import { NextResponse } from "next/server";
import { anchorQuestion } from "@git-investigator/core/anchor-question";
import { sessionToken } from "@/lib/auth/current-user";
import { captureQuestion } from "@/lib/capture";
import { type CollectInput, parseLocation } from "@git-investigator/core/collect";
import { parseGitHubRepo } from "@git-investigator/core/collect/github";
import { parseGitLabRepo } from "@git-investigator/core/collect/gitlab";
import { collectorAuthError, maybeDelegate } from "@/lib/collect/remote";
import { resolveRepoInput } from "@/lib/collect/resolve";
import { runWithTokens } from "@git-investigator/core/collect/token-context";
import { githubAppConfigured, installUrl, installationTokenForRepo } from "@/lib/github-app";
import { investigate } from "@git-investigator/core/investigate";
import { rateLimit } from "@/lib/ratelimit";
import type { ArtifactRef, DigResult } from "@git-investigator/core/types";

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

  const token = req.headers.get("x-github-token")?.trim() || (await sessionToken()) || undefined;
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

  const gh = parseGitHubRepo(repoPath);
  let githubToken = token;
  if (!githubToken && gh && githubAppConfigured()) {
    try {
      githubToken = (await installationTokenForRepo(gh.owner, gh.repo)) ?? undefined;
    } catch {
      githubToken = undefined;
    }
    if (!githubToken) {
      const link = installUrl();
      return NextResponse.json(
        {
          error: `The Git Investigator GitHub App isn't installed on ${gh.owner}${
            link ? ` — install it: ${link}` : ""
          }.`,
        },
        { status: 400 },
      );
    }
  }

  let result: DigResult;
  try {
    const collectPath =
      gh || parseGitLabRepo(repoPath) ? repoPath : (await resolveRepoInput(repoPath)).path;
    result = await runWithTokens({ github: githubToken, gitlab: gitlabToken }, () =>
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
