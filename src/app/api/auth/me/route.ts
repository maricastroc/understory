import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";

export const runtime = "nodejs";

export function GET(req: NextRequest) {
  let user = null;
  try {
    user = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  } catch {
    //
  }
  return NextResponse.json({ user });
}
