import { NextResponse } from "next/server";
import { isGitRepo } from "@git-investigator/core/collect/git";
import { parseGitHubRepo } from "@git-investigator/core/collect/github";
import { parseGitLabRepo } from "@git-investigator/core/collect/gitlab";
import {
  type MapFile,
  mapHistories,
  MAX_MAP_FILES,
} from "@git-investigator/core/collect/history/map-histories";
import {
  githubHistorySource,
  localHistorySource,
} from "@git-investigator/core/collect/history/sources";
import { isCommitSha } from "@git-investigator/core/collect/sha";
import { runWithTokens } from "@git-investigator/core/collect/token-context";
import { sessionToken } from "@/lib/auth/current-user";
import { collectorAuthError, maybeDelegate } from "@/lib/collect/remote";
import { resolveRepoInput } from "@/lib/collect/resolve";
import { githubTokenForRepo } from "@/lib/github-app";
import { ensureHistoryStore } from "@/lib/history-store";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_CACHED_FILES = 40;

type Body = { repo?: string; ref?: string; files?: unknown; mode?: string };

function parseFiles(raw: unknown): MapFile[] | null {
  if (!Array.isArray(raw)) return null;
  const files: MapFile[] = [];
  for (const f of raw) {
    if (!f || typeof f !== "object") return null;
    const { path, blobSha, size } = f as Record<string, unknown>;
    if (typeof path !== "string" || !path || typeof blobSha !== "string" || !blobSha) return null;
    files.push({ path, blobSha, size: typeof size === "number" ? size : null });
  }
  return files;
}

export async function POST(req: Request) {
  const authError = collectorAuthError(req);
  if (authError) return authError;

  const limited = await rateLimit(req, "map");
  if (limited) return limited;

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const repo = (body.repo ?? "").trim();
  const ref = (body.ref ?? "").trim();
  const mode = body.mode === "map" ? "map" : "cached";
  const files = parseFiles(body.files);
  if (!repo || !isCommitSha(ref) || !files) {
    return NextResponse.json(
      { error: "repo, ref (a commit sha) and files are required" },
      {
        status: 400,
      },
    );
  }
  if (files.length > (mode === "map" ? MAX_MAP_FILES : MAX_CACHED_FILES)) {
    return NextResponse.json({ error: "Too many files in one request" }, { status: 400 });
  }

  const delegated = await maybeDelegate(req, repo, body);
  if (delegated) return delegated;

  ensureHistoryStore();
  const token = req.headers.get("x-github-token")?.trim() || (await sessionToken()) || undefined;

  return runWithTokens({ github: await githubTokenForRepo(token, repo) }, async () => {
    try {
      const gh = parseGitHubRepo(repo);
      if (gh) {
        const histories = await mapHistories(
          githubHistorySource(gh.owner, gh.repo),
          ref,
          files,
          mode,
        );
        return NextResponse.json({ files: histories });
      }
      if (parseGitLabRepo(repo)) {
        return NextResponse.json(
          { error: "The history map is not available for GitLab repositories yet" },
          { status: 400 },
        );
      }
      const { path } = await resolveRepoInput(repo);
      if (!(await isGitRepo(path))) {
        return NextResponse.json({ error: `Not a git repository: ${repo}` }, { status: 400 });
      }
      const histories = await mapHistories(await localHistorySource(path), ref, files, mode);
      return NextResponse.json({ files: histories });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : String(e) },
        { status: 400 },
      );
    }
  });
}
