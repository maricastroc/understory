import { type NextRequest, NextResponse } from "next/server";
import { appOrigin } from "@/lib/auth/origin";
import { SESSION_COOKIE, signSession } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const origin = appOrigin(req);
  const fail = (reason: string) =>
    NextResponse.redirect(`${origin}/app?auth_error=${encodeURIComponent(reason)}`);

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const cookieState = req.cookies.get("gi_oauth_state")?.value;
  if (!code || !state || state !== cookieState) return fail("invalid_state");

  const clientId = process.env.NEXT_PUBLIC_GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret || !process.env.AUTH_SECRET) return fail("not_configured");

  let accessToken: string;
  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: `${origin}/api/auth/callback`,
      }),
    });
    const tokenJson = (await tokenRes.json()) as { access_token?: string };
    if (!tokenJson.access_token) return fail("token_exchange_failed");
    accessToken = tokenJson.access_token;
  } catch {
    return fail("token_exchange_failed");
  }

  let gh: { login: string; name: string | null; avatar_url: string };
  try {
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "understory",
      },
    });
    if (!userRes.ok) return fail("profile_failed");
    gh = (await userRes.json()) as { login: string; name: string | null; avatar_url: string };
  } catch {
    return fail("profile_failed");
  }

  const res = NextResponse.redirect(`${origin}/app`);
  res.cookies.set(
    SESSION_COOKIE,
    signSession(
      { login: gh.login, name: gh.name ?? gh.login, avatarUrl: gh.avatar_url },
      accessToken,
    ),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    },
  );
  res.cookies.delete("gi_oauth_state");
  return res;
}
