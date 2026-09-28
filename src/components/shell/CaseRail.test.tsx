import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "@/test/axe";
import { syntheticCases, syntheticPrCases } from "../line-investigation/fixtures/synthetic-cases";
import { SYNTHETIC_NOW } from "../line-investigation/fixtures/synthetic-retry-cap";
import { CaseRail } from "./CaseRail";
import { filterRail, lineRailItems, prRailItems } from "./rail-items";
import type { RailFilter, RailItem } from "./types";

const lines = lineRailItems(syntheticCases, {
  activeId: "GI-2049",
  now: Date.parse(SYNTHETIC_NOW),
});
const prs = prRailItems(syntheticPrCases, null);
const footer = { name: "Guest", initials: "?", subline: "Sign in to save line cases" };

function Harness({
  onSelect = () => {},
  onRemove,
}: {
  onSelect?: (i: RailItem) => void;
  onRemove?: (i: RailItem) => void;
}) {
  const [filter, setFilter] = useState<RailFilter>("all");
  return (
    <CaseRail
      items={filterRail(lines, prs, filter)}
      filter={filter}
      onFilter={setFilter}
      onSelect={onSelect}
      onRemove={onRemove}
      footer={footer}
    />
  );
}

const rows = () =>
  within(screen.getByRole("navigation", { name: "Case list" })).queryAllByRole("listitem");

describe("CaseRail", () => {
  it("lists line and PR cases with the current case marked and children nested under their parent", () => {
    render(<Harness />);
    const current = screen.getByRole("button", { current: "page" });
    expect(current.textContent).toContain("Why exactly 3 retries?");
    expect(current.textContent).toContain("resolved");
    const titles = rows().map((r) => within(r).getAllByRole("button")[0].textContent ?? "");
    const parent = titles.findIndex((t) => t.includes("Why exactly 3 retries?"));
    expect(titles[parent + 1]).toContain("from B · review·dmitri-k");
    expect(titles.some((t) => t.includes("#944 · 3 of 8 regions"))).toBe(true);
    expect(screen.getByText(String(lines.length + prs.length))).toBeTruthy();
  });

  it("filters by kind", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("radio", { name: "PRs" }));
    expect(rows()).toHaveLength(prs.length);
    await user.click(screen.getByRole("radio", { name: "Lines" }));
    expect(rows()).toHaveLength(lines.length);
  });

  it("selects and removes a case", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onRemove = vi.fn();
    render(<Harness onSelect={onSelect} onRemove={onRemove} />);
    await user.click(screen.getByRole("button", { name: /^Drop legacy webhook path/ }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ kind: "pr" }));
    await user.click(screen.getByRole("button", { name: "Remove “Drop legacy webhook path”" }));
    expect(onRemove).toHaveBeenCalledWith(expect.objectContaining({ kind: "pr" }));
  });

  it("explains the empty rail and has no axe violations", async () => {
    const { container, rerender } = render(<Harness />);
    expect((await axe(container)).violations).toEqual([]);
    rerender(
      <CaseRail
        items={[]}
        filter="all"
        onFilter={() => {}}
        onSelect={() => {}}
        footer={footer}
        showFilters={false}
        onNew={() => {}}
      />,
    );
    expect(screen.getByText("No investigations yet.")).toBeTruthy();
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(screen.getByRole("button", { name: "New investigation" })).toBeTruthy();
    expect(screen.getByText("Sign in to save line cases")).toBeTruthy();
  });
});
