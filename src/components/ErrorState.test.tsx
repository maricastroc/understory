import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import type { Locale } from "@/i18n/locales";
import type { ApiFailure } from "@/lib/api-error";
import { axe } from "@/test/axe";
import { ErrorState } from "./ErrorState";

vi.mock("./investigator/use-auth", () => ({ authEnabled: true }));

const shown = (
  locale: Locale,
  failure: ApiFailure,
  extra: Partial<Parameters<typeof ErrorState>[0]> = {},
) =>
  render(
    <LocaleProvider locale={locale}>
      <ErrorState failure={failure} title={`title in ${locale}`} {...extra} />
    </LocaleProvider>,
  );

const alertText = () => screen.getByRole("alert").textContent;

const NOT_FOUND: ApiFailure = {
  code: "not-found",
  detail: "GitHub API 404 — not found",
  host: "GitHub",
};

describe("ErrorState", () => {
  it("says what happened in the reader's language and keeps the original text as a detail", () => {
    shown("pt-BR", NOT_FOUND);
    expect(screen.getByText("Este repositório parece privado ou não existe.")).toBeTruthy();
    const detail = screen.getByText("GitHub API 404 — not found");
    expect(detail.getAttribute("lang")).toBe("en");
  });

  it("keeps the English lead it had for the same failure", () => {
    shown("en", NOT_FOUND);
    expect(screen.getByText("This repository looks private or doesn't exist.")).toBeTruthy();
  });

  it("offers signing in for a repository it cannot see, unless the reader is signed in", () => {
    const { unmount } = shown("pt-BR", NOT_FOUND, { onRetry: () => {} });
    expect(screen.getByRole("link", { name: "Entrar com o GitHub" })).toBeTruthy();
    expect(alertText()).toContain("sem precisar de token");
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeTruthy();
    unmount();
    shown("pt-BR", NOT_FOUND, { signedIn: true });
    expect(screen.queryByRole("link", { name: "Entrar com o GitHub" })).toBeNull();
  });

  it("names the host that is limiting requests", () => {
    shown("pt-BR", { code: "rate-limited", detail: "GitLab API 429", host: "GitLab" });
    expect(screen.getByText("O GitLab está limitando as requisições no momento.")).toBeTruthy();
  });

  it("writes the wait before a retry in words, and leaves out the server's own text", () => {
    shown("pt-BR", {
      code: "busy",
      detail: "Rate limit exceeded — try again in 20s.",
      retryAfter: 20,
    });
    expect(alertText()).toBe("Muitas requisições seguidas. Tente novamente em 20 segundos.");
    const { container } = render(
      <LocaleProvider locale="en">
        <ErrorState failure={{ code: "busy", detail: null, retryAfter: 1 }} title="" />
      </LocaleProvider>,
    );
    expect(container.textContent).toBe("Too many requests in a row. Try again in 1 second.");
  });

  it("falls back on the title of the place for a failure it cannot name", () => {
    shown("pt-BR", { code: "failed", detail: "Bad location" });
    expect(screen.getByText("title in pt-BR")).toBeTruthy();
    expect(screen.getByText("Bad location").getAttribute("lang")).toBe("en");
  });

  it("does not repeat a network error's own words", () => {
    shown("en", { code: "network", detail: null });
    expect(alertText()).toBe("Couldn't reach the server. Check your connection.");
  });

  it("links to the GitHub App when installing it can give access", () => {
    shown(
      "pt-BR",
      { ...NOT_FOUND, installUrl: "https://github.com/apps/understory" },
      { signedIn: true },
    );
    const link = screen.getByRole("link", { name: "Instalar o app no GitHub" });
    expect(link.getAttribute("href")).toBe("https://github.com/apps/understory");
    expect(alertText()).toContain("Se o repositório for privado");
  });

  it("has no em dash in what it writes, only in the original detail", () => {
    for (const locale of ["en", "pt-BR"] as const) {
      const { unmount } = shown(locale, { code: "rate-limited", detail: null, host: "GitHub" });
      expect(alertText()).not.toContain("—");
      unmount();
    }
  });

  it("has no axe violations in either language", async () => {
    for (const locale of ["en", "pt-BR"] as const) {
      const { container, unmount } = shown(locale, NOT_FOUND, { onRetry: () => {} });
      expect((await axe(container)).violations).toEqual([]);
      unmount();
    }
  });
});
