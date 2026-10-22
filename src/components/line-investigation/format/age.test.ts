import { describe, expect, it } from "vitest";
import { ageParts } from "./age";

const years = (y: number) => y * 365.25;

describe("age formatting", () => {
  it("splits days into years, months and days", () => {
    expect(ageParts(years(3.5))).toEqual({ years: 3, months: 6, days: 0 });
    expect(ageParts(-5)).toEqual({ years: 0, months: 0, days: 0 });
  });
});
