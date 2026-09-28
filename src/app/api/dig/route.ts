import { NextResponse } from "next/server";
import { anchorQuestion } from "@git-investigator/core/anchor-question";
import { sessionToken } from "@/lib/auth/current-user";
import { captureQuestion } from "@/lib/capture";
import { type CollectInput, collect, parseLocation } from "@git-investigator/core/collect";
import { parseGitHubRepo } from "@git-investigator/core/collect/github";
import { parseGitLabRepo } from "@git-investigator/core/collect/gitlab";
import { collectorAuthError, maybeDelegate } from "@/lib/collect/remote";
import { resolveRepoInput } from "@/lib/collect/resolve";
import { runWithTokens } from "@git-investigator/core/collect/token-context";
import { githubAppConfigured, githubTokenForRepo, installUrl } from "@/lib/github-app";
import { narrate } from "@git-investigator/core/investigate";
import { ensureHistoryStore } from "@/lib/history-store";
import { rateLimit } from "@/lib/ratelimit";
import type { ArtifactRef, Evidence } from "@git-investigator/core/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const DEFAULT_LINE_QUESTION = "Why is this line the way it is? Reconstruct why it changed.";

export async function POST(req: Request) {
  const authError = collectorAuthError(req);
  if (authError) return authError;

  const limited = await rateLimit(req, "ai");
  if (limited) return limited;

  ensureHistoryStore();

  let body: {
    repoPath?: string;
    location?: string;
    question?: string;
    target?: ArtifactRef;
    noCapture?: boolean;
    language?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { repoPath, location, question, target, noCapture } = body;
  const language = body.language === "pt" || body.language === "en" ? body.language : "auto";
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
  const githubToken = await githubTokenForRepo(token, repoPath);

  let evidence: Evidence;
  try {
    const collectPath =
      gh || parseGitLabRepo(repoPath) ? repoPath : (await resolveRepoInput(repoPath)).path;
    evidence = await runWithTokens({ github: githubToken, gitlab: gitlabToken }, () =>
      collect({ repoPath: collectPath, ...collectArgs }),
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const link = !githubToken && githubAppConfigured() ? installUrl() : null;
    const hint =
      gh && link
        ? ` If ${gh.owner}/${gh.repo} is private, install the Git Investigator GitHub App: ${link}`
        : "";
    return NextResponse.json({ error: `${message}${hint}` }, { status: 400 });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (obj: unknown) => controller.enqueue(enc.encode(`${JSON.stringify(obj)}\n`));
      try {
        send({ phase: "evidence", evidence });
        const { narrative, error } = await narrate(evidence, { language });
        send({ phase: "final", narrative, error });
      } catch (e) {
        send({
          phase: "final",
          narrative: null,
          error: e instanceof Error ? e.message : String(e),
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
