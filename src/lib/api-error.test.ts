import { describe, expect, it } from "vitest";
import { failureFrom, NETWORK_FAILURE, thrownFailure } from "./api-error";

describe("failureFrom", () => {
  it("keeps the server's code, host, install link and its original text as the detail", () => {
    const res = new Response(null, { status: 400 });
    expect(
      failureFrom(res, {
        error: "GitHub API 404 — not found. If acme/x is private, install: https://app",
        detail: "GitHub API 404 — not found",
        code: "not-found",
        host: "GitHub",
        installUrl: "https://app",
      }),
    ).toEqual({
      code: "not-found",
      detail: "GitHub API 404 — not found",
      host: "GitHub",
      installUrl: "https://app",
    });
  });

  it("falls back on the status when the body has no code it knows", () => {
    expect(
      failureFrom(new Response(null, { status: 400 }), { error: "nope", code: "odd" }),
    ).toEqual({ code: "failed", detail: "nope" });
    expect(failureFrom(new Response(null, { status: 504 }), null)).toEqual({
      code: "server",
      detail: "HTTP 504",
    });
    expect(
      failureFrom(new Response(null, { status: 429, headers: { "Retry-After": "20" } }), {
        error: "Rate limit exceeded",
        code: "busy",
      }),
    ).toEqual({ code: "busy", detail: "Rate limit exceeded", retryAfter: 20 });
  });

  it("ignores a host it does not know", () => {
    const res = new Response(null, { status: 400 });
    expect(failureFrom(res, { code: "rate-limited", host: "Bitbucket" })).toEqual({
      code: "rate-limited",
      detail: null,
    });
  });
});

describe("thrownFailure", () => {
  it("keeps what was thrown as the detail of a failure", () => {
    expect(thrownFailure(new Error("Unexpected token <"))).toEqual({
      code: "failed",
      detail: "Unexpected token <",
    });
    expect(NETWORK_FAILURE).toEqual({ code: "network", detail: null });
  });
});
