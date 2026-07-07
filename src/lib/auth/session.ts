import crypto from "node:crypto";

export type SessionUser = { login: string; name: string; avatarUrl: string };
type Payload = SessionUser & { exp: number };

export const SESSION_COOKIE = "gi_session";

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
}

const sign = (body: string) =>
  crypto.createHmac("sha256", secret()).update(body).digest("base64url");

export function signSession(user: SessionUser, ttlMs = 7 * 24 * 60 * 60 * 1000): string {
  const payload: Payload = { ...user, exp: Date.now() + ttlMs };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifySession(token: string | undefined): SessionUser | null {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;

  const expected = sign(body);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as Payload;
    if (typeof p.exp !== "number" || p.exp < Date.now()) return null;
    return { login: p.login, name: p.name, avatarUrl: p.avatarUrl };
  } catch {
    return null;
  }
}
