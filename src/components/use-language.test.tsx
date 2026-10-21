import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import type { Locale } from "@/i18n/locales";
import { useLanguage } from "./use-language";

function Probe() {
  const { language, explicit, setLanguage } = useLanguage();
  return (
    <div>
      <output data-testid="language">{language}</output>
      <output data-testid="explicit">{explicit ?? "none"}</output>
      <button type="button" onClick={() => setLanguage("en")}>
        en
      </button>
    </div>
  );
}

const within = (locale: Locale) => (
  <LocaleProvider locale={locale}>
    <Probe />
  </LocaleProvider>
);

const shown = (id: string) => screen.getByTestId(id).textContent;

afterEach(() => window.localStorage.clear());

describe("the answer language", () => {
  it("follows the interface when nobody has chosen one", () => {
    const { rerender } = render(within("pt-BR"));
    expect(shown("language")).toBe("pt");
    expect(shown("explicit")).toBe("none");
    rerender(within("en"));
    expect(shown("language")).toBe("en");
    expect(window.localStorage.getItem("gi:lang")).toBeNull();
  });

  it("keeps a choice made before, whatever the interface says", () => {
    window.localStorage.setItem("gi:lang", "en");
    const { rerender } = render(within("pt-BR"));
    expect(shown("language")).toBe("en");
    expect(shown("explicit")).toBe("en");
    window.localStorage.setItem("gi:lang", "pt");
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: "gi:lang" })));
    rerender(within("en"));
    expect(shown("language")).toBe("pt");
    expect(window.localStorage.getItem("gi:lang")).toBe("pt");
  });

  it("ignores a stored value it does not know and follows the interface", () => {
    window.localStorage.setItem("gi:lang", "fr");
    render(within("pt-BR"));
    expect(shown("language")).toBe("pt");
    expect(shown("explicit")).toBe("none");
  });

  it("stores a choice under gi:lang, in the format it always had", () => {
    render(within("pt-BR"));
    act(() => screen.getByRole("button", { name: "en" }).click());
    expect(window.localStorage.getItem("gi:lang")).toBe("en");
    expect(shown("language")).toBe("en");
  });

  it("is English without a provider, as before", () => {
    render(<Probe />);
    expect(shown("language")).toBe("en");
  });
});
