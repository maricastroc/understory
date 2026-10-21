import { describe, expect, it } from "vitest";
import { answerLanguageOf, isLocale, LOCALES, localeFrom, offeredLocales } from "./locales";

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

  it("reads English when the cookie is missing, unknown or not offered", () => {
    const both = ["en", "pt-BR"] as const;
    expect(localeFrom(undefined, both)).toBe("en");
    expect(localeFrom("fr", both)).toBe("en");
    expect(localeFrom("pt", both)).toBe("en");
    expect(localeFrom("pt-BR", both)).toBe("pt-BR");
    expect(localeFrom("en", both)).toBe("en");
    expect(localeFrom("pt-BR", ["en"])).toBe("en");
  });

  it("offers Portuguese outside production, and in production only when it is switched on", () => {
    expect(offeredLocales({ NODE_ENV: "development" })).toEqual(["en", "pt-BR"]);
    expect(offeredLocales({ NODE_ENV: "test" })).toEqual(["en", "pt-BR"]);
    expect(offeredLocales({ NODE_ENV: "production" })).toEqual(["en"]);
    expect(offeredLocales({ NODE_ENV: "production", UNDERSTORY_PT_BR: "1" })).toEqual([
      "en",
      "pt-BR",
    ]);
    expect(offeredLocales({ NODE_ENV: "production", UNDERSTORY_PT_BR: "true" })).toEqual(["en"]);
  });
});
