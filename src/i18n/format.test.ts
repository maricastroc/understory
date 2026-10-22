import { describe, expect, it } from "vitest";
import {
  depthLabel,
  formatDay,
  formatDayMonth,
  formatMonthYear,
  formatNumber,
  formatSeconds,
  longAge,
  shortAge,
} from "./format";
import { messagesFor } from "./messages";

const en = messagesFor("en").time;
const pt = messagesFor("pt-BR").time;
const DAYS = [0, 0.4, 1, 5, 13, 31, 45, 200, 366, 400, 800, 3650, 3700];

describe("format", () => {
  it("writes a wait in seconds with the right plural", () => {
    expect(formatSeconds("en", 1)).toBe("1 second");
    expect(formatSeconds("en", 20)).toBe("20 seconds");
    expect(formatSeconds("pt-BR", 1)).toBe("1 segundo");
    expect(formatSeconds("pt-BR", 20)).toBe("20 segundos");
  });

  it("groups thousands the way each language does", () => {
    expect(formatNumber("en", 12345)).toBe("12,345");
    expect(formatNumber("pt-BR", 12345)).toBe("12.345");
  });

  it("writes ages in English exactly as before", () => {
    expect(DAYS.map((d) => shortAge(en, d))).toEqual([
      "0d",
      "0d",
      "1d",
      "5d",
      "13d",
      "1m",
      "1m",
      "6m",
      "1y",
      "1y 1m",
      "2y 2m",
      "9y 11m",
      "10y 1m",
    ]);
    expect(DAYS.map((d) => longAge(en, d))).toEqual([
      "less than a day",
      "less than a day",
      "1 day",
      "5 days",
      "13 days",
      "1 month",
      "1 month",
      "6 months",
      "1 year",
      "1 year 1 month",
      "2 years 2 months",
      "9 years 11 months",
      "10 years 1 month",
    ]);
    expect(shortAge(en, 3.5 * 365.25)).toBe("3y 6m");
    expect(shortAge(en, 2 * 365.25)).toBe("2y");
    expect(shortAge(en, 70)).toBe("2m");
    expect(longAge(en, 3.5 * 365.25)).toBe("3 years 6 months");
  });

  it("writes ages in Portuguese, short and long, with plurals and the conjunction", () => {
    expect(DAYS.map((d) => shortAge(pt, d))).toEqual([
      "0d",
      "0d",
      "1d",
      "5d",
      "13d",
      "1m",
      "1m",
      "6m",
      "1a",
      "1a 1m",
      "2a 2m",
      "9a 11m",
      "10a 1m",
    ]);
    expect(longAge(pt, 0)).toBe("menos de um dia");
    expect(longAge(pt, 1)).toBe("1 dia");
    expect(longAge(pt, 5)).toBe("5 dias");
    expect(longAge(pt, 31)).toBe("1 mês");
    expect(longAge(pt, 200)).toBe("6 meses");
    expect(longAge(pt, 366)).toBe("1 ano");
    expect(longAge(pt, 400)).toBe("1 ano e 1 mês");
    expect(longAge(pt, 800)).toBe("2 anos e 2 meses");
  });

  it("labels the depth axis in each language's short units", () => {
    expect(depthLabel(en, 2, "w")).toBe("−2w");
    expect(depthLabel(pt, 2, "w")).toBe("−2sem");
    expect(depthLabel(pt, 5, "y")).toBe("−5a");
  });

  it("writes a day in English exactly as before, and in Portuguese without padding", () => {
    expect(formatDay(en, "2023-03-09T10:00:00Z")).toBe("09 Mar 2023");
    expect(formatDay(en, "2023-11-27T10:00:00Z")).toBe("27 Nov 2023");
    expect(formatDay(en, "2024-12-31")).toBe("31 Dec 2024");
    expect(formatDay(en, "2023-09-01T23:59:00-03:00")).toBe("01 Sep 2023");
    expect(formatDay(en, "unknown")).toBe("unknown");
    expect(formatDay(pt, "2023-03-09T10:00:00Z")).toBe("9 mar 2023");
    expect(formatDay(pt, "2023-09-01T23:59:00-03:00")).toBe("1 set 2023");
    expect(formatDay(pt, "not a date")).toBe("not a date");
    expect(formatDayMonth(pt, "2023-12-08T00:00:00Z")).toEqual({ dayMonth: "8 dez", year: "2023" });
    expect(formatDayMonth(en, "2023-12-08T00:00:00Z")).toEqual({ dayMonth: "8 Dec", year: "2023" });
  });

  it("writes a month and its year, for a stretch of history", () => {
    expect(formatMonthYear(en, "2024-03-09T10:00:00Z")).toBe("Mar 2024");
    expect(formatMonthYear(pt, "2024-03-09T10:00:00Z")).toBe("mar 2024");
    expect(formatMonthYear(pt, "not a date")).toBe("not a date");
  });
});
