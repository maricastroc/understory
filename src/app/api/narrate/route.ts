import { NextResponse } from "next/server";
import { narrate } from "@understory/core/investigate";
import { getModel } from "@understory/core/llm";
import type { Evidence } from "@understory/core/types";
import { AI_DAILY_LIMIT_REACHED } from "@/lib/ai-limit";
import { collectorAuthError } from "@/lib/collect/remote";
import { consumeAiDailyLimit, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_BODY = 2_000_000;
const MAX_ARTIFACTS = 400;

function isEvidence(v: unknown): v is Evidence {
  if (!v || typeof v !== "object") return false;
  const e = v as Partial<Evidence>;
  return (
    typeof e.question === "string" &&
    !!e.repo &&
    typeof e.repo === "object" &&
    Array.isArray(e.artifacts) &&
    e.artifacts.length <= MAX_ARTIFACTS &&
    Array.isArray(e.contradictions)
  );
}

export async function POST(req: Request) {
  const authError = collectorAuthError(req);
  if (authError) return authError;

  const limited = await rateLimit(req, "ai");
  if (limited) return limited;

  const raw = await req.text();
  if (raw.length > MAX_BODY) {
    return NextResponse.json({ error: "The evidence is too large to rewrite" }, { status: 413 });
  }
  let body: { evidence?: unknown; language?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { evidence, language } = body;
  if (language !== "en" && language !== "pt") {
    return NextResponse.json({ error: "language must be en or pt" }, { status: 400 });
  }
  if (!isEvidence(evidence)) {
    return NextResponse.json({ error: "evidence is required" }, { status: 400 });
  }

  if (getModel() !== null && !(await consumeAiDailyLimit())) {
    return NextResponse.json({ narrative: null, error: AI_DAILY_LIMIT_REACHED });
  }
  const { narrative, error } = await narrate(evidence, { language });
  return NextResponse.json({ narrative, ...(error ? { error } : {}) });
}
