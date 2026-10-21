import { describe, expect, it } from "vitest";
import { answerLanguageOf, isLocale, LOCALES, localeFrom } from "./locales";

describe("locales", () => {
  it("knows English and Brazilian Portuguese, and nothing else", () => {
    expect(LOCALES).toEqual(["en", "pt-BR"]);
    expect(isLocale("pt-BR")).toBe(true);
    expect(isLocale("pt")).toBe(false);
    expect(isLocale("en-US")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });

  it("gives each interface language the answer language it defaults to", () => {
    expect(answerLanguageOf("en")).toBe("en");
    expect(answerLanguageOf("pt-BR")).toBe("pt");
  });

  it("reads English when the cookie is missing or unknown", () => {
    expect(localeFrom(undefined)).toBe("en");
    expect(localeFrom("")).toBe("en");
    expect(localeFrom("fr")).toBe("en");
    expect(localeFrom("pt")).toBe("en");
    expect(localeFrom("pt-BR")).toBe("pt-BR");
    expect(localeFrom("en")).toBe("en");
  });
});
