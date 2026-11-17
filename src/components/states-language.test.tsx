import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import type { Locale } from "@/i18n/locales";
import { ErrorState } from "./ErrorState";
import { MapSearch } from "./composer/MapSearch";
import { RepoStage } from "./composer/RepoStage";
import { LoadingCard } from "./investigator/LoadingCard";
import { PendingSlots } from "./line-investigation/why/PendingSlots";

const inLocale = (ui: React.ReactNode, locale: Locale = "en") =>
  render(<LocaleProvider locale={locale}>{ui}</LocaleProvider>);

const corners = (el: Element) => el.querySelectorAll(":scope > span.pointer-events-none").length;

const repo = (connecting: boolean, locale: Locale = "en") =>
  inLocale(
    <RepoStage
      repoPath="acme/payments"
      onEdit={() => {}}
      onOpen={() => {}}
      connecting={connecting}
      error={null}
      token=""
      onTokenChange={() => {}}
      signedIn={false}
      demoRepo={null}
      onOpenDemo={() => {}}
      onOpenRecent={() => {}}
    />,
    locale,
  );

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("waiting in the landing's language", () => {
  it("draws the pending answer as dashed slots, not grey bars", () => {
    const { container } = inLocale(<PendingSlots caption="Collecting the line's history…" />);
    const status = screen.getByRole("status");
    expect(status.textContent).toBe("Collecting the line's history…");
    const slots = container.querySelectorAll("ul[aria-hidden] > li");
    expect(slots).toHaveLength(3);
    for (const slot of slots) {
      const [mark, line] = slot.children;
      expect(mark.className).toContain("border-dashed");
      expect(mark.className).toContain("rounded-full");
      expect(line.className).toContain("border-dashed");
    }
    expect(container.querySelector(".bg-li-neutral-200")).toBeNull();
  });

  it("counts the seconds of the wait once the first one has passed", () => {
    inLocale(<PendingSlots caption="Collecting the line's history…" />);
    expect(screen.getByRole("status").textContent).not.toContain("·");
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.getByRole("status").textContent).toContain("· 4 seconds");
  });

  it("counts them in Portuguese too, out of the screen reader's way", () => {
    inLocale(<PendingSlots caption="Coletando o histórico da linha…" />, "pt-BR");
    act(() => vi.advanceTimersByTime(2000));
    const count = screen.getByText("· 2 segundos");
    expect(count.getAttribute("aria-hidden")).toBe("true");
  });

  it("opens the repository with a still dashed mark and the time spent reading", () => {
    repo(true);
    const button = screen.getByRole("button", { name: /Opening/ });
    expect(button.querySelector(".animate-spin")).toBeNull();
    expect(button.querySelector("span.border-dashed.rounded-full")).toBeTruthy();
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByText(/Reading the repository/).textContent).toContain("· 3 seconds");
  });

  it("says nothing about time when it is not reading", () => {
    repo(false);
    act(() => vi.advanceTimersByTime(3000));
    expect(document.body.textContent).not.toMatch(/seconds/);
  });

  it("searches the files with the same still mark", () => {
    const { container } = inLocale(
      <MapSearch
        query="charge"
        onQuery={() => {}}
        results={[]}
        searching
        note=""
        onOpen={() => {}}
        onSubmit={() => {}}
      />,
    );
    expect(container.querySelector(".animate-spin")).toBeNull();
    expect(container.querySelector("span.border-dashed.rounded-full")).toBeTruthy();
  });

  it("frames the investigating card as a plate, with the time it has taken", () => {
    inLocale(<LoadingCard />);
    const card = screen.getByRole("status");
    expect(card.className).not.toContain("shadow");
    expect(corners(card)).toBe(4);
    expect(card.querySelector(".animate-spin")).toBeNull();
    act(() => vi.advanceTimersByTime(5000));
    expect(card.textContent).toContain("· 5 seconds");
  });
});

describe("a failure in the landing's language", () => {
  const failure = { code: "server" as const, detail: "HTTP 502" };

  it("is a plate with corners, without an alarm icon or a shadow", () => {
    inLocale(<ErrorState failure={failure} title="title" onRetry={() => {}} />);
    const alert = screen.getByRole("alert");
    expect(corners(alert)).toBe(4);
    expect(alert.querySelector("svg")).toBeNull();
    expect(alert.className).not.toContain("shadow");
    expect(alert.className).not.toMatch(/gap-ink|li-gap/);
    expect(screen.getByText("HTTP 502").className).toContain("font-li-mono");
  });

  it("stays a plain rule when it sits flush inside another surface", () => {
    inLocale(<ErrorState failure={failure} title="title" flush />);
    expect(corners(screen.getByRole("alert"))).toBe(0);
  });
});
