import { describe, expect, it } from "vitest";
import { basename, fmtDate, letter, levelLabel } from "./format";

describe("fmtDate", () => {
  it("formats an ISO timestamp as 'DD Mon YYYY'", () => {
    expect(fmtDate("2023-11-27T10:00:00Z")).toBe("27 Nov 2023");
    expect(fmtDate("2024-01-05")).toBe("05 Jan 2024");
  });

  it("returns the input unchanged when it lacks a Y-M-D shape", () => {
    expect(fmtDate("unknown")).toBe("unknown");
  });
});

describe("letter / basename", () => {
  it("maps indices to exhibit letters", () => {
    expect(letter(0)).toBe("A");
    expect(letter(25)).toBe("Z");
  });

  it("takes the last non-empty path segment", () => {
    expect(basename("a/b/payments-service")).toBe("payments-service");
    expect(basename("a/b/")).toBe("b");
    expect(basename("solo")).toBe("solo");
  });
});

describe("levelLabel", () => {
  it("labels confidence levels", () => {
    expect(levelLabel.high).toBe("High");
    expect(levelLabel.medium).toBe("Medium");
    expect(levelLabel.low).toBe("Low");
  });
});
