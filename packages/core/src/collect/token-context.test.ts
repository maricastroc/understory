import { afterEach, describe, expect, it } from "vitest";
import { getRequestToken, resolveToken, runWithToken, runWithTokens } from "./token-context";

describe("runWithToken / getRequestToken", () => {
  it("is undefined outside any run", () => {
    expect(getRequestToken()).toBeUndefined();
  });

  it("exposes the token inside the run", () => {
    expect(runWithToken("abc", () => getRequestToken())).toBe("abc");
  });

  it("normalizes an empty token to undefined", () => {
    expect(runWithToken("", () => getRequestToken())).toBeUndefined();
  });

  it("isolates nested runs (inner wins, does not leak out)", () => {
    const inner = runWithToken("outer", () => runWithToken("inner", () => getRequestToken()));
    expect(inner).toBe("inner");
    expect(getRequestToken()).toBeUndefined();
  });
});

describe("resolveToken — precedence", () => {
  const original = process.env.GITHUB_TOKEN;
  afterEach(() => {
    if (original === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = original;
  });

  it("falls back to the server env token when no request token is set", () => {
    process.env.GITHUB_TOKEN = "env-token";
    expect(resolveToken()).toBe("env-token");
  });

  it("prefers the request token over the env token", () => {
    process.env.GITHUB_TOKEN = "env-token";
    expect(runWithToken("req-token", () => resolveToken())).toBe("req-token");
  });

  it("is undefined when neither is present", () => {
    delete process.env.GITHUB_TOKEN;
    expect(resolveToken()).toBeUndefined();
  });
});

// The collectors call resolveToken() deep inside an async chain (collect → enrich → graphql),
// so the token must survive `await` boundaries — this is what lets the VS Code local mode and
// the web backend inject a token via runWithTokens. AsyncLocalStorage guarantees it; lock it.
describe("runWithTokens — survives awaits", () => {
  it("keeps the request token across awaits inside an async callback", async () => {
    const seen = await runWithTokens({ github: "req-token" }, async () => {
      await Promise.resolve();
      await Promise.resolve();
      return resolveToken();
    });
    expect(seen).toBe("req-token");
  });
});
