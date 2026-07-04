import type { NextRequest } from "next/server";

/** Public origin of the app, honoring the proxy headers Vercel sets. */
export function appOrigin(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}
