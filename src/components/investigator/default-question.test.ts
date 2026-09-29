import { describe, expect, it } from "vitest";
import {
  DEEP_LINK_QUESTION,
  LINE_QUESTION,
  RANGE_QUESTION,
  defaultQuestion,
  isDefaultQuestion,
} from "./default-question";

describe("defaultQuestion", () => {
  it("asks about the line, the range or the named symbol", () => {
    expect(defaultQuestion({ start: 9, end: 9 })).toBe(LINE_QUESTION);
    expect(defaultQuestion({ start: 8, end: 12 })).toBe(RANGE_QUESTION);
    expect(defaultQuestion({ start: 3, end: 30, name: "chargeCustomer" })).toBe(
      "Why is chargeCustomer the way it is?",
    );
    expect(defaultQuestion({ start: 3, end: 30, name: null })).toBe(RANGE_QUESTION);
  });

  it("keeps line numbers and file names out of the question", () => {
    expect(defaultQuestion({ start: 9, end: 9 })).not.toMatch(/\d/);
    expect(defaultQuestion({ start: 8, end: 12 })).not.toMatch(/\d/);
  });
});

describe("isDefaultQuestion", () => {
  it("recognises the general questions, including the deep-link one", () => {
    expect(isDefaultQuestion(LINE_QUESTION)).toBe(true);
    expect(isDefaultQuestion(` ${RANGE_QUESTION} `)).toBe(true);
    expect(isDefaultQuestion(DEEP_LINK_QUESTION)).toBe(true);
    expect(isDefaultQuestion("Why cap the retries at 3?")).toBe(false);
    expect(isDefaultQuestion("Why is chargeCustomer the way it is?")).toBe(false);
  });
});
