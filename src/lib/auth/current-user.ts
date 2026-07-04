import type { NextRequest } from "next/server";
import { SESSION_COOKIE, type SessionUser, verifySession } from "./session";

/** The signed-in user for a request, or null (missing/bad cookie, or no AUTH_SECRET). */
export function currentUser(req: NextRequest): SessionUser | null {
  try {
    return verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  } catch {
    return null;
  }
}
