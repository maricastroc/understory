/**
 * POST /api/dig — the whole pipeline, connected. Runs server-side because it
 * shells out to git and reads GROQ_API_KEY.
 *
 *   resolve repo (clone if URL)  ->  collect (git)  ->  synthesize (LLM)  ->  verify
 */

import { NextResponse } from "next/server";
import { collect, parseLocation } from "@/lib/collect";
import { resolveRepoInput } from "@/lib/collect/resolve";
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

  let loc;
  try {
    loc = parseLocation(location);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }

  // [1] Resolve the repo (clone on demand), then [2][3] collect — deterministic.
  let evidence;
  try {
    const { path } = await resolveRepoInput(repoPath);
    evidence = await collect({
      repoPath: path,
      question: question?.trim() || "Why is this line the way it is? Reconstruct why it changed.",
      location: loc,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }

  // [4][5] Synthesize + verify — needs the key. If absent/failing, still return
  // the collected evidence so the UI can show the deterministic half.
  const result: DigResult = { evidence, narrative: null };
  if (!process.env.GROQ_API_KEY) {
    result.error = "GROQ_API_KEY is not set on the server (.env.local) — showing collected evidence only.";
  } else {
    try {
      result.narrative = verify(evidence, await synthesize(evidence));
    } catch (e) {
      result.error = `Synthesis failed: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  return NextResponse.json(result);
}
