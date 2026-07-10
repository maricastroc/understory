import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, type SessionUser, sessionGithubToken, verifySession } from "./session";

export function currentUser(req: NextRequest): SessionUser | null {
  try {
    return verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  } catch {
    return null;
  }
}

export async function sessionToken(): Promise<string | undefined> {
  try {
    const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
    return sessionGithubToken(cookie) ?? undefined;
  } catch {
    return undefined;
  }
}
