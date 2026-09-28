import { describe, expect, it } from "vitest";
import { canonicalCitation, canonicalCitations } from "./citation-id";

const known = new Set(["commit:c319fe2", "commit:cbe25d6", "pr:4011", "issue:1234567"]);

describe("canonicalCitation", () => {
  it("leaves an id that was collected exactly as it is", () => {
    expect(canonicalCitation("commit:c319fe2", known)).toBe("commit:c319fe2");
    expect(canonicalCitation("pr:4011", known)).toBe("pr:4011");
  });

  it("resolves a bare sha to the single collected commit it names", () => {
    expect(canonicalCitation("c319fe2", known)).toBe("commit:c319fe2");
  });

  it("resolves a full sha whose short form was collected", () => {
    expect(canonicalCitation("c319fe20000000000000000000000000000000ff", known)).toBe(
      "commit:c319fe2",
    );
  });

  it("ignores case when matching the sha", () => {
    expect(canonicalCitation("C319FE2", known)).toBe("commit:c319fe2");
  });

  it("keeps a bare sha that matches no collected commit — it stays a fabrication", () => {
    expect(canonicalCitation("deadbee", known)).toBe("deadbee");
  });

  it("keeps a bare sha that matches more than one collected commit — ambiguity is not resolved", () => {
    const twins = new Set(["commit:abc1234aa", "commit:abc1234bb"]);
    expect(canonicalCitation("abc1234", twins)).toBe("abc1234");
  });

  it("keeps a prefix too short to be a sha", () => {
    expect(canonicalCitation("c319fe", known)).toBe("c319fe");
  });

  it("never maps onto a collected artifact that is not a commit", () => {
    expect(canonicalCitation("1234567", known)).toBe("1234567");
  });

  it("keeps an id that is not a bare sha", () => {
    expect(canonicalCitation("ghost", known)).toBe("ghost");
    expect(canonicalCitation("#4011", known)).toBe("#4011");
  });
});

describe("canonicalCitations", () => {
  it("canonicalizes each id and preserves order", () => {
    expect(canonicalCitations(["cbe25d6", "pr:4011", "deadbee"], known)).toEqual([
      "commit:cbe25d6",
      "pr:4011",
      "deadbee",
    ]);
  });
});
