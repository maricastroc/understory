import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import type { Locale } from "@/i18n/locales";
import { axe } from "@/test/axe";
import { LocaleMenu } from "./LocaleMenu";

const setLocale = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("@/i18n/set-locale", () => ({ setLocale }));

const menu = (locale: Locale, offered: Locale[] = ["en", "pt-BR"]) =>
  render(
    <LocaleProvider locale={locale} offered={offered}>
      <LocaleMenu />
    </LocaleProvider>,
  );

afterEach(() => setLocale.mockClear());

describe("LocaleMenu", () => {
  it("is not shown while only one language is offered", () => {
    const { container } = menu("en", ["en"]);
    expect(container.innerHTML).toBe("");
  });

  it("names itself and the current language in the interface's language", () => {
    menu("en");
    expect(screen.getByRole("button", { name: "Language: English" })).toBeTruthy();
    menu("pt-BR");
    const pt = screen.getByRole("button", { name: "Idioma: Português" });
    expect(pt.querySelector("[lang='pt-BR']")?.textContent).toBe("Português");
  });

  it("lists each language in its own language and marks the current one", () => {
    menu("pt-BR");
    const trigger = screen.getByRole("button", { name: "Idioma: Português" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    const list = screen.getByRole("list", { name: "Idioma" });
    const options = within(list).getAllByRole("button");
    expect(options.map((o) => [o.textContent, o.getAttribute("lang")])).toEqual([
      ["English", "en"],
      ["Português", "pt-BR"],
    ]);
    expect(options[1].getAttribute("aria-current")).toBe("true");
    expect(options[0].getAttribute("aria-current")).toBeNull();
    expect(document.activeElement).toBe(options[1]);
  });

  it("saves the language picked, and nothing when the current one is picked again", () => {
    menu("en");
    const trigger = screen.getByRole("button", { name: "Language: English" });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "English" }));
    expect(setLocale).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(trigger);
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "Português" }));
    expect(setLocale).toHaveBeenCalledWith("pt-BR");
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("closes on Escape and gives the focus back", () => {
    menu("en");
    const trigger = screen.getByRole("button", { name: "Language: English" });
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole("button", { name: "English" }), { key: "Escape" });
    expect(screen.queryByRole("list")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("has no axe violations, closed or open", async () => {
    const { container } = menu("pt-BR");
    expect((await axe(container)).violations).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Idioma: Português" }));
    expect((await axe(container)).violations).toEqual([]);
  });
});
