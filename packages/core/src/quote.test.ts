import { describe, expect, it } from "vitest";
import { locateQuote, sourcePassages, sourceQuote, verifyQuote } from "./quote";

const BODY = "Bound retries in chargeCustomer to 3 attempts\nwith 1s/2s/4s backoff. Fixes #1187.";

describe("verifyQuote — the deterministic proof gate", () => {
  const GATE =
    "Cap retries at 3 because the upstream gateway rate-limits\nbursts above five per second.";

  it("accepts a snippet that appears verbatim in the source", () => {
    expect(verifyQuote(GATE, "the upstream gateway rate-limits")).toBe(
      "the upstream gateway rate-limits",
    );
  });

  it("ignores case and collapsed whitespace/newlines", () => {
    expect(verifyQuote(GATE, "RATE-LIMITS   bursts above five")).toBe(
      "RATE-LIMITS   bursts above five",
    );
    expect(verifyQuote(BODY, "3 attempts with 1s/2s/4s backoff")).toBe(
      "3 attempts with 1s/2s/4s backoff",
    );
  });

  it("rejects a snippet the model invented", () => {
    expect(verifyQuote(GATE, "because the database was slow")).toBeNull();
    expect(verifyQuote(BODY, "five attempts")).toBeNull();
  });

  it("rejects a too-short snippet that would match noise", () => {
    expect(verifyQuote(GATE, "at 3")).toBeNull();
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

describe("verifyQuote — the same words in other typography", () => {
  const COMMIT =
    'Custom promises have a state of "unknown" by default.  All custom\npromises have an "inspect" method, regardless of whether one is\nspecified.';
  const REVERT =
    "WH-2402: zero is also what the vendor sends when a SKU sells out, so the\nstorefront kept showing the last positive stock for sold-out items.";
  const PR = "Add `path.resolve` when`fs.writeFileSync` called with temp file path.";

  it("accepts single quotation marks where the source has double ones", () => {
    expect(verifyQuote(COMMIT, "All custom promises have an 'inspect' method")).not.toBeNull();
  });

  it("accepts a typographic hyphen where the source has a plain one", () => {
    expect(verifyQuote(REVERT, "the last positive stock for sold\u2011out items")).not.toBeNull();
  });

  it("accepts a passage whose code marks were dropped or whose spacing was repaired", () => {
    expect(verifyQuote(PR, "Add path.resolve when fs.writeFileSync called")).not.toBeNull();
  });

  it("still rejects a changed word, a corrected typo or a flipped operator", () => {
    expect(verifyQuote(COMMIT, "All custom promises get an 'inspect' method")).toBeNull();
    expect(
      verifyQuote("Rules are not responsible for disabling theirselves.", "disabling themselves"),
    ).toBeNull();
    expect(verifyQuote("retry while attempts <= 3", "retry while attempts >= 3")).toBeNull();
  });

  it("still rejects two passages joined with a full stop the source does not have", () => {
    expect(
      verifyQuote(COMMIT, 'state of "unknown" by default. regardless of whether one is specified'),
    ).toBeNull();
  });

  it("does not count quotation marks towards the minimum length", () => {
    expect(verifyQuote('He said "at 3".', '"at 3"')).toBeNull();
    expect(verifyQuote("'' '' '' ''", "'' '' ''")).toBeNull();
  });
});

describe("sourceQuote — what is kept is the source's own text", () => {
  const COMMIT =
    'All custom\npromises have an "inspect" method, regardless of whether one is\nspecified.';

  it("returns the passage as the source wrote it, on one line", () => {
    expect(sourceQuote(COMMIT, "custom promises have an 'inspect' method, regardless")).toBe(
      'custom promises have an "inspect" method, regardless',
    );
  });

  it("keeps the quotation marks that open or close the passage", () => {
    const body = 'The reply was "not a security update" and nothing else.';
    expect(sourceQuote(body, "'not a security update'")).toBe('"not a security update"');
    const r = locateQuote(body, "'not a security update'");
    expect(body.slice(r!.start, r!.end)).toBe('"not a security update"');
  });

  it("returns null for a passage the source does not contain", () => {
    expect(sourceQuote(COMMIT, "promises are always inspectable")).toBeNull();
  });
});

describe("sourcePassages — an item of several sentences is checked one sentence at a time", () => {
  const COMMIT =
    'Make all promises inspectable by default\n\nCustom promises have a state of "unknown" by default.  All custom\npromises have an "inspect" method, regardless of whether one is\nspecified.';

  it("returns a continuous passage whole", () => {
    expect(sourcePassages(COMMIT, "a state of 'unknown' by default. All custom promises")).toEqual([
      'a state of "unknown" by default. All custom promises',
    ]);
  });

  it("accepts whole sentences of the source strung together with a full stop it does not have", () => {
    expect(
      sourcePassages(
        COMMIT,
        "Make all promises inspectable by default. All custom promises have an 'inspect' method, regardless of whether one is specified.",
      ),
    ).toEqual([
      "Make all promises inspectable by default",
      'All custom promises have an "inspect" method, regardless of whether one is specified',
    ]);
  });

  it("accepts lines of the source given without the lines between them", () => {
    const list =
      "* formatterLoader\n  * allow uncompiled custom formatters\n  * try resolve formatter module relative to current directory first";
    expect(
      sourcePassages(
        list,
        "* formatterLoader\n  * try resolve formatter module relative to current directory first",
      ),
    ).toHaveLength(2);
  });

  it("rejects the item when any sentence is not in the source", () => {
    expect(
      sourcePassages(COMMIT, "Make all promises inspectable by default. Promises are now faster."),
    ).toBeNull();
  });

  it("does not take '...' for a sentence end, so an abbreviated passage is still rejected", () => {
    expect(
      sourcePassages(
        COMMIT,
        "Custom promises have a state... regardless of whether one is specified.",
      ),
    ).toBeNull();
  });

  it("rejects an item with a sentence too short to check", () => {
    expect(sourcePassages(COMMIT, "Make all promises inspectable by default. Done.")).toBeNull();
  });
});
