import { describe, expect, it } from "vitest";
import { readingOn } from "./reading-flag";

describe("the reading in the case screen", () => {
  it("is off by default, in production as in development", () => {
    expect(readingOn({}, { NODE_ENV: "production" })).toBe(false);
    expect(readingOn({}, { NODE_ENV: "development" })).toBe(false);
  });

  it("is on wherever UNDERSTORY_READING is 1", () => {
    expect(readingOn({}, { NODE_ENV: "production", UNDERSTORY_READING: "1" })).toBe(true);
    expect(readingOn({}, { NODE_ENV: "development", UNDERSTORY_READING: "1" })).toBe(true);
  });

  it("can be asked for with ?reading=1 outside production only", () => {
    expect(readingOn({ reading: "1" }, { NODE_ENV: "development" })).toBe(true);
    expect(readingOn({ reading: "1" }, { NODE_ENV: "test" })).toBe(true);
    expect(readingOn({ reading: "1" }, { NODE_ENV: "production" })).toBe(false);
    expect(readingOn({ reading: ["1"] }, { NODE_ENV: "development" })).toBe(false);
  });
});
