import { describe, expect, it } from "vitest";
import { ageParts, longAge, shortAge } from "./age";

const years = (y: number) => y * 365.25;

describe("age formatting", () => {
  it("splits days into years, months and days", () => {
    expect(ageParts(years(3.5))).toEqual({ years: 3, months: 6, days: 0 });
    expect(ageParts(-5)).toEqual({ years: 0, months: 0, days: 0 });
  });

  it("formats the short tooltip form", () => {
    expect(shortAge(years(3.5))).toBe("3y 6m");
    expect(shortAge(years(2))).toBe("2y");
    expect(shortAge(70)).toBe("2m");
    expect(shortAge(12)).toBe("12d");
  });

  it("formats the spoken form", () => {
    expect(longAge(years(3.5))).toBe("3 years 6 months");
    expect(longAge(years(1) + 31)).toBe("1 year 1 month");
    expect(longAge(1)).toBe("1 day");
    expect(longAge(0.2)).toBe("less than a day");
  });
});
