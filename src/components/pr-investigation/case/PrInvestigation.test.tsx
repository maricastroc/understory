import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { axe } from "@/test/axe";
import { SYNTHETIC_PR_NOW, syntheticPr944 } from "../fixtures/synthetic-pr-944";
import { syntheticPrEvidenceOnly } from "../fixtures/synthetic-pr-states";
import { PrInvestigation } from "./PrInvestigation";

const NOW = Date.parse(SYNTHETIC_PR_NOW);
const rect = HTMLElement.prototype.getBoundingClientRect;

beforeEach(() => {
  window.localStorage.clear();
  HTMLElement.prototype.getBoundingClientRect = function () {
    return {
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      bottom: 0,
      right: 1120,
      width: 1120,
      height: 0,
      toJSON() {},
    } as DOMRect;
  };
});

afterEach(() => {
  HTMLElement.prototype.getBoundingClientRect = rect;
});

const setup = (result = syntheticPr944) =>
  render(<PrInvestigation result={result} now={NOW} onDrill={() => {}} />);
const list = () => screen.getByRole("region", { name: "Changed regions" });
const row = (id: string) => within(list()).getByRole("button", { name: new RegExp(`^${id},`) });
const tab = (id: string) =>
  screen.getAllByRole("button", { name: new RegExp(`^${id},`) }).find((b) => !list().contains(b))!;
const clause = (n: number) =>
  document.querySelectorAll<HTMLButtonElement>("li[data-clause] button")[n];
const letters = () =>
  [...document.querySelectorAll("span.pointer-events-none.absolute > span")].map(
    (s) => s.textContent,
  );

describe("PrInvestigation — default", () => {
  it("shows the PR, the coverage, every region, the clauses and one history per core", async () => {
    const { container } = setup();
    expect(
      screen.getByRole("heading", { level: 1, name: "Drop legacy webhook path" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: /6 of 8 regions explained/ })).toBeTruthy();
    expect(within(list()).getAllByRole("button")).toHaveLength(8);
    expect(document.querySelectorAll("li[data-clause]")).toHaveLength(3);
    expect(screen.getAllByRole("region", { name: /^History of R\d$/ })).toHaveLength(8);
    expect(letters()).toEqual([]);
    expect(screen.queryByRole("tooltip")).toBeNull();
    expect(screen.queryByText(/0\.8\d/)).toBeNull();
    expect((await axe(container)).violations).toEqual([]);
  });

  it("names each region with its path, lines, diff size and state", () => {
    setup();
    expect(row("R4").getAttribute("aria-label")).toBe(
      "R4, webhooks/verify.ts lines 40 to 52, 1 added 4 removed, explained",
    );
    expect(row("R5").getAttribute("aria-label")).toMatch(/not recorded$/);
  });
});

describe("PrInvestigation — clauses and regions", () => {
  it("previewing a clause dims the regions it does not rest on and draws the comb", () => {
    setup();
    fireEvent.focus(clause(0));
    expect(row("R5").className).toContain("opacity-45");
    expect(row("R1").className).not.toContain("opacity-45");
    expect(document.querySelector("svg path.stroke-li-evidence")).not.toBeNull();
    fireEvent.focus(clause(2));
    expect(document.querySelector("svg path.stroke-li-gap")).not.toBeNull();
  });

  it("selects a region the same way from its row, its tab or its core", async () => {
    const user = userEvent.setup();
    for (const pick of ["row", "tab", "core"] as const) {
      const { unmount } = setup();
      if (pick === "row") await user.click(row("R4"));
      if (pick === "tab") await user.click(tab("R4"));
      if (pick === "core") {
        const strip = document.querySelectorAll<HTMLButtonElement>(
          'button[aria-hidden="true"][tabindex="-1"]',
        )[3];
        await user.click(strip);
      }
      expect(row("R4").getAttribute("aria-pressed")).toBe("true");
      expect(screen.getByRole("region", { name: "Diff for R4" })).toBeTruthy();
      expect(letters().sort()).toEqual(["F", "G", "H", "I", "J"]);
      expect(screen.getByText("webhooks/verify.ts · 40–52")).toBeTruthy();
      unmount();
    }
  });

  it("moves the selection with the arrow keys", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(row("R4"));
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(row("R5").getAttribute("aria-pressed")).toBe("true");
  });
});

describe("PrInvestigation — artifacts", () => {
  it("shows one tooltip for the shared PR, and Escape dismisses only the tooltip", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(row("R4"));
    const band = screen.getAllByRole("button", { name: /pull request pr:1020/ })[0];
    fireEvent.focus(band);
    const tip = screen.getByRole("tooltip");
    expect(tip.textContent).toContain("R1 · R2 · R3 · R4");
    expect(band.getAttribute("aria-describedby")).toBe(tip.id);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).toBeNull();
    expect(row("R4").getAttribute("aria-pressed")).toBe("true");
  });

  it("lists where an artifact appears and jumps to that region from the drawer", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getAllByRole("button", { name: /pull request pr:1020/ })[0]);
    const drawer = screen.getByRole("dialog");
    const links = within(drawer).getAllByRole("button", { name: /^R\d · / });
    expect(links.map((b) => b.textContent)).toEqual([
      "R1 · legacy.ts 1–88",
      "R2 · router.ts 14–22",
      "R3 · router.ts 60–71",
      "R4 · verify.ts 40–52",
    ]);
    await user.click(links[1]);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(row("R2").getAttribute("aria-pressed")).toBe("true");
  });

  it("steps across every entry in depth order", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: /All evidence · 16/ }));
    expect(screen.getByText("16 entries, 2 gaps, deepest last")).toBeTruthy();
    await user.click(screen.getAllByRole("button", { name: /commit 3f0a9d1/ })[0]);
    const seen = new Set<string>();
    for (let i = 0; i < 20; i++) {
      seen.add(screen.getByRole("dialog").querySelector("h2")!.textContent!);
      fireEvent.keyDown(window, { key: "ArrowDown" });
    }
    expect(seen.size).toBe(16);
  });
});

describe("PrInvestigation — coverage and Escape", () => {
  it("keeps the derived confidence inside the coverage popover", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: /regions explained/ }));
    const pop = screen.getByRole("dialog", { name: "How much of this PR is explained" });
    expect(within(pop).getByText("6 of 8 regions recorded and grounded")).toBeTruthy();
    expect(within(pop).getByText("R5 and R8 end at direct commits: not recorded")).toBeTruthy();
    expect(within(pop).getByText(/medium–high/)).toBeTruthy();
  });

  it("closes the drawer, then the popover, then clears the clause and region", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(row("R4"));
    await user.click(clause(0));
    await user.click(screen.getByRole("button", { name: /All evidence/ }));
    await user.click(screen.getByRole("button", { name: /regions explained/ }));
    expect(screen.getByText(/deepest last/)).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByText(/deepest last/)).toBeNull();
    expect(screen.getByRole("dialog", { name: "How much of this PR is explained" })).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(row("R4").getAttribute("aria-pressed")).toBe("true");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(row("R4").getAttribute("aria-pressed")).toBe("false");
    expect(clause(0).getAttribute("aria-pressed")).toBe("false");
  });

  it("says when there is only evidence", () => {
    setup(syntheticPrEvidenceOnly());
    expect(screen.getByRole("button", { name: /Evidence only/ })).toBeTruthy();
    expect(screen.getByText("No reconstruction. The evidence below is complete.")).toBeTruthy();
    expect(document.querySelectorAll("li[data-clause]")).toHaveLength(0);
  });
});
