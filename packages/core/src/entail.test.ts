import { describe, expect, it } from "vitest";
import { finalizeCheck, verifyQuote } from "./entail";

const BODY = "Cap retries at 3 because the upstream gateway rate-limits\nbursts above five per second.";

describe("verifyQuote — the deterministic proof gate", () => {
  it("accepts a snippet that appears verbatim in the source", () => {
    expect(verifyQuote(BODY, "the upstream gateway rate-limits")).toBe(
      "the upstream gateway rate-limits",
    );
  });

  it("ignores case and collapsed whitespace/newlines", () => {
    expect(verifyQuote(BODY, "RATE-LIMITS   bursts above five")).toBe(
      "RATE-LIMITS   bursts above five",
    );
  });

  it("rejects a snippet the model invented", () => {
    expect(verifyQuote(BODY, "because the database was slow")).toBeNull();
  });

  it("rejects a too-short snippet that would match noise", () => {
    expect(verifyQuote(BODY, "at 3")).toBeNull();
  });
});

describe("finalizeCheck — the judge cannot vouch for itself", () => {
  it("keeps 'supported' when the quote is real", () => {
    const c = finalizeCheck("commit:c1", BODY, {
      status: "supported",
      quote: "the upstream gateway rate-limits",
      reason: "commit states the cap reason",
    });
    expect(c.status).toBe("supported");
    expect(c.quote).toBe("the upstream gateway rate-limits");
  });

  it("downgrades 'supported' to 'unsupported' when the quote is not in the source", () => {
    const c = finalizeCheck("commit:c1", BODY, {
      status: "supported",
      quote: "because the database was slow",
      reason: "claims a db reason",
    });
    expect(c.status).toBe("unsupported");
    expect(c.quote).toBeNull();
    expect(c.reason).toMatch(/not found in the source/);
  });

  it("keeps 'weak' as-is and only surfaces a verified quote", () => {
    const c = finalizeCheck("pr:1", BODY, {
      status: "weak",
      quote: "no such text",
      reason: "on topic, does not state it",
    });
    expect(c.status).toBe("weak");
    expect(c.quote).toBeNull();
  });

  it("passes 'unsupported' through with no quote", () => {
    const c = finalizeCheck("issue:9", BODY, {
      status: "unsupported",
      quote: "",
      reason: "unrelated",
    });
    expect(c.status).toBe("unsupported");
    expect(c.quote).toBeNull();
  });
});
