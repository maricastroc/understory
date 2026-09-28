import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "@/test/axe";
import { syntheticCases } from "../line-investigation/fixtures/synthetic-cases";
import { SYNTHETIC_NOW } from "../line-investigation/fixtures/synthetic-retry-cap";
import { CaseRail } from "./CaseRail";
import { lineRailItems } from "./rail-items";
import type { RailItem } from "./types";

const lines = lineRailItems(syntheticCases, {
  activeId: "GI-2049",
  now: Date.parse(SYNTHETIC_NOW),
});
const footer = { name: "Guest", initials: "?", subline: "Sign in to save line cases" };

function Harness({
  onSelect = () => {},
  onRemove,
}: {
  onSelect?: (i: RailItem) => void;
  onRemove?: (i: RailItem) => void;
}) {
  return <CaseRail items={lines} onSelect={onSelect} onRemove={onRemove} footer={footer} />;
}

const rows = () =>
  within(screen.getByRole("navigation", { name: "Case list" })).queryAllByRole("listitem");

describe("CaseRail", () => {
  it("lists line cases with the current case marked and children nested under their parent", () => {
    render(<Harness />);
    const current = screen.getByRole("button", { current: "page" });
    expect(current.textContent).toContain("Why exactly 3 retries?");
    expect(current.textContent).toContain("resolved");
    const titles = rows().map((r) => within(r).getAllByRole("button")[0].textContent ?? "");
    const parent = titles.findIndex((t) => t.includes("Why exactly 3 retries?"));
    expect(titles[parent + 1]).toContain("from B · review·dmitri-k");
    expect(screen.getByText(String(lines.length))).toBeTruthy();
  });

  it("selects and removes a case", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onRemove = vi.fn();
    render(<Harness onSelect={onSelect} onRemove={onRemove} />);
    await user.click(screen.getByRole("button", { name: /^Why does refund skip the ledger\?/ }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "GI-2052" }));
    await user.click(
      screen.getByRole("button", { name: "Remove “Why does refund skip the ledger?”" }),
    );
    expect(onRemove).toHaveBeenCalledWith(expect.objectContaining({ id: "GI-2052" }));
  });

  it("explains the empty rail and has no axe violations", async () => {
    const { container, rerender } = render(<Harness />);
    expect((await axe(container)).violations).toEqual([]);
    rerender(<CaseRail items={[]} onSelect={() => {}} footer={footer} onNew={() => {}} />);
    expect(screen.getByText("No investigations yet.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "New investigation" })).toBeTruthy();
    expect(screen.getByText("Sign in to save line cases")).toBeTruthy();
  });
});
