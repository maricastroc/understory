import { NextResponse } from "next/server";
import { runWithTokens } from "@git-investigator/core/collect/token-context";
import { investigateDiff } from "@git-investigator/core/diff/investigate";
import { sessionToken } from "@/lib/auth/current-user";
import { githubAppConfigured, installationTokenForRepo } from "@/lib/github-app";
import { parsePr } from "@/lib/parse-pr";
import { ensureHistoryStore } from "@/lib/history-store";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const limited = await rateLimit(req, "ai");
  if (limited) return limited;

  ensureHistoryStore();

  let body: { pr?: string; language?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const language = body.language === "pt" || body.language === "en" ? body.language : "auto";
  const spec = parsePr(String(body.pr ?? ""));
  if (!spec) {
    return NextResponse.json(
      { error: "Paste a GitHub pull request URL (or owner/repo#123)." },
      { status: 400 },
    );
  }

  const { owner, repo, number } = spec;
  let githubToken =
    req.headers.get("x-github-token")?.trim() || (await sessionToken()) || undefined;
  if (!githubToken && githubAppConfigured()) {
    try {
      githubToken = (await installationTokenForRepo(owner, repo)) ?? undefined;
    } catch {
      githubToken = undefined;
    }
  }

  try {
    const result = await runWithTokens({ github: githubToken }, () =>
      investigateDiff({ owner, repo, number }, { language }),
    );
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 400 },
    );
  }
}
