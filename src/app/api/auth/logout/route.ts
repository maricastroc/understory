import { type NextRequest, NextResponse } from "next/server";
import { appOrigin } from "@/lib/auth/origin";
import { SESSION_COOKIE } from "@/lib/auth/session";

export const runtime = "nodejs";

export function POST(req: NextRequest) {
  const res = NextResponse.redirect(`${appOrigin(req)}/app`, { status: 303 });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
