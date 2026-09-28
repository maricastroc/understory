import { describe, expect, it } from "vitest";
import { locateQuote, verifyQuote } from "./quote";

const BODY = "Bound retries in chargeCustomer to 3 attempts\nwith 1s/2s/4s backoff. Fixes #1187.";

describe("verifyQuote", () => {
  it("keeps the same contract after moving out of entail", () => {
    expect(verifyQuote(BODY, "3 attempts with 1s/2s/4s backoff")).toBe(
      "3 attempts with 1s/2s/4s backoff",
    );
    expect(verifyQuote(BODY, "at 3")).toBeNull();
    expect(verifyQuote(BODY, "five attempts")).toBeNull();
  });
});

describe("locateQuote", () => {
  it("returns the exact original span for a verbatim quote", () => {
    const quote = "Bound retries in chargeCustomer";
    const r = locateQuote(BODY, quote);
    expect(r).toEqual({ start: 0, end: quote.length });
  });

  it("maps a quote that crosses a newline back onto the original body", () => {
    const r = locateQuote(BODY, "3 attempts with 1s/2s/4s backoff");
    expect(r).not.toBeNull();
    expect(BODY.slice(r!.start, r!.end)).toBe("3 attempts\nwith 1s/2s/4s backoff");
  });

  it("ignores case and collapsed whitespace, like verifyQuote", () => {
    const r = locateQuote(BODY, "  BOUND   retries  in chargecustomer ");
    expect(BODY.slice(r!.start, r!.end)).toBe("Bound retries in chargeCustomer");
  });

  it("handles leading whitespace and runs of blank lines in the body", () => {
    const body = "\n\n  first line\n\n\n  second   line here";
    const r = locateQuote(body, "first line second line");
    expect(body.slice(r!.start, r!.end)).toBe("first line\n\n\n  second   line");
  });

  it("returns null when the quote would not pass verifyQuote", () => {
    expect(locateQuote(BODY, "at 3")).toBeNull();
    expect(locateQuote(BODY, "retries in refundCharge")).toBeNull();
  });
});
