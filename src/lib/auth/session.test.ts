import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sessionGithubToken, signSession, verifySession } from "./session";

describe("session sign/verify", () => {
  const prev = process.env.AUTH_SECRET;
  beforeAll(() => {
    process.env.AUTH_SECRET = "test-secret-abc";
  });
  afterAll(() => {
    if (prev === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = prev;
  });

  const user = { login: "octocat", name: "The Octocat", avatarUrl: "https://x/y.png" };

  it("round-trips a valid session", () => {
    expect(verifySession(signSession(user))).toEqual(user);
  });

  it("rejects a tampered payload (mac no longer matches)", () => {
    const mac = signSession(user).split(".")[1];
    const forged = Buffer.from(
      JSON.stringify({ ...user, login: "attacker", exp: Date.now() + 1_000_000 }),
    ).toString("base64url");
    expect(verifySession(`${forged}.${mac}`)).toBeNull();
  });

  it("rejects an expired session", () => {
    expect(verifySession(signSession(user, undefined, -1000))).toBeNull();
  });

  it("encrypts and round-trips the github token, and keeps it out of the public user", () => {
    const token = signSession(user, "gho_secret_token");
    expect(sessionGithubToken(token)).toBe("gho_secret_token");
    expect(verifySession(token)).toEqual(user);
    // the raw token must not appear in the (signed-but-readable) cookie body
    expect(Buffer.from(token.split(".")[0], "base64url").toString()).not.toContain(
      "gho_secret_token",
    );
  });

  it("returns null token when the session carries none", () => {
    expect(sessionGithubToken(signSession(user))).toBeNull();
  });

  it("rejects a session signed with a different secret", () => {
    const token = signSession(user);
    process.env.AUTH_SECRET = "a-different-secret";
    expect(verifySession(token)).toBeNull();
    process.env.AUTH_SECRET = "test-secret-abc";
  });

  it("returns null for a missing token without throwing", () => {
    expect(verifySession(undefined)).toBeNull();
  });
});
