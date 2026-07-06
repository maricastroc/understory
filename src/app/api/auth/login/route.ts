import crypto from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { appOrigin } from "@/lib/auth/origin";

export const runtime = "nodejs";

const CLIENT_ID = process.env.NEXT_PUBLIC_GITHUB_OAUTH_CLIENT_ID;

export function GET(req: NextRequest) {
  const origin = appOrigin(req);
  if (!CLIENT_ID) {
    return NextResponse.redirect(
      `${origin}/app?auth_error=${encodeURIComponent("not_configured")}`,
    );
  }

  const state = crypto.randomUUID();
  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", CLIENT_ID);
  authorize.searchParams.set("redirect_uri", `${origin}/api/auth/callback`);
  authorize.searchParams.set("scope", "read:user");
  authorize.searchParams.set("state", state);

  const res = NextResponse.redirect(authorize.toString());
  res.cookies.set("gi_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
