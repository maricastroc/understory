import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";

export const runtime = "nodejs";

export function GET(req: NextRequest) {
  let user = null;
  try {
    user = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  } catch {
    // AUTH_SECRET missing / bad cookie — treat as signed out.
  }
  return NextResponse.json({ user });
}
