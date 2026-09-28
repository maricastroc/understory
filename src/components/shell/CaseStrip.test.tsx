import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "@/test/axe";
import { syntheticCases } from "../line-investigation/fixtures/synthetic-cases";
import { SYNTHETIC_NOW } from "../line-investigation/fixtures/synthetic-retry-cap";
import { CaseStrip } from "./CaseStrip";
import { lineRailItems } from "./rail-items";

const items = lineRailItems(syntheticCases, {
  activeId: "GI-2049",
  now: Date.parse(SYNTHETIC_NOW),
});

describe("CaseStrip", () => {
  it("is one control that names the count and the open case, and opens the list", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const { container } = render(<CaseStrip items={items} expanded={false} onOpen={onOpen} />);
    const button = screen.getByRole("button");
    expect(button.getAttribute("aria-label")).toBe(
      "Show investigations, 5. Open: Why exactly 3 retries?",
    );
    expect(button.getAttribute("aria-expanded")).toBe("false");
    await user.click(button);
    expect(onOpen).toHaveBeenCalledOnce();
    expect((await axe(container)).violations).toEqual([]);
  });

  it("works without an open case", () => {
    render(<CaseStrip items={[]} expanded onOpen={() => {}} />);
    expect(screen.getByRole("button").getAttribute("aria-label")).toBe("Show investigations, 0");
  });
});
