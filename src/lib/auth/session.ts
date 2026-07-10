import crypto from "node:crypto";

export type SessionUser = { login: string; name: string; avatarUrl: string };
type Payload = SessionUser & { exp: number; gh?: string };

export const SESSION_COOKIE = "gi_session";

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
}

const sign = (body: string) =>
  crypto.createHmac("sha256", secret()).update(body).digest("base64url");

function encryptionKey(): Buffer {
  return crypto.createHash("sha256").update(secret()).digest();
}

function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, enc].map((b) => b.toString("base64url")).join(":");
}

function decrypt(payload: string): string | null {
  try {
    const [ivB, tagB, dataB] = payload.split(":");
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      encryptionKey(),
      Buffer.from(ivB, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagB, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}

export function signSession(
  user: SessionUser,
  githubToken?: string,
  ttlMs = 7 * 24 * 60 * 60 * 1000,
): string {
  const payload: Payload = { ...user, exp: Date.now() + ttlMs };
  if (githubToken) payload.gh = encrypt(githubToken);
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function readPayload(token: string | undefined): Payload | null {
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
    return p;
  } catch {
    return null;
  }
}

export function verifySession(token: string | undefined): SessionUser | null {
  const p = readPayload(token);
  return p ? { login: p.login, name: p.name, avatarUrl: p.avatarUrl } : null;
}

export function sessionGithubToken(token: string | undefined): string | null {
  const p = readPayload(token);
  return p?.gh ? decrypt(p.gh) : null;
}
