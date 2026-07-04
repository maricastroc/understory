import { describe, expect, it } from "vitest";
import { basename, fmtCount, fmtDate, letter, levelLabel } from "./format";

describe("fmtCount", () => {
  it("leaves counts under 1k untouched", () => {
    expect(fmtCount(0)).toBe("0");
    expect(fmtCount(999)).toBe("999");
  });

  it("uses one decimal for thousands under 10k, none above", () => {
    expect(fmtCount(1500)).toBe("1.5k");
    expect(fmtCount(24000)).toBe("24k");
    expect(fmtCount(246230)).toBe("246k");
  });

  it("uses millions past 1m", () => {
    expect(fmtCount(2_400_000)).toBe("2.4m");
  });
});

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
