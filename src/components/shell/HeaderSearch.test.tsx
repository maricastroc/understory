import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "@/test/axe";
import { syntheticCases, syntheticPrCases } from "../line-investigation/fixtures/synthetic-cases";
import { SYNTHETIC_NOW } from "../line-investigation/fixtures/synthetic-retry-cap";
import { HeaderSearch } from "./HeaderSearch";
import { lineRailItems, prRailItems } from "./rail-items";

const cases = [
  ...lineRailItems(syntheticCases, { activeId: null, now: Date.parse(SYNTHETIC_NOW) }),
  ...prRailItems(syntheticPrCases, null),
];

describe("HeaderSearch", () => {
  it("searches only cases when no repository is open", () => {
    render(<HeaderSearch cases={cases} onSelectCase={() => {}} files={null} />);
    expect(screen.getByRole("combobox").getAttribute("placeholder")).toBe("Search cases");
  });

  it("filters cases and opens the chosen one with the keyboard", async () => {
    const user = userEvent.setup();
    const onSelectCase = vi.fn();
    const { container } = render(
      <HeaderSearch cases={cases} onSelectCase={onSelectCase} files={null} />,
    );
    const box = screen.getByRole("combobox");
    await user.type(box, "webhook");
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0].textContent).toContain("Drop legacy webhook path");
    expect((await axe(container)).violations).toEqual([]);
    await user.keyboard("{Enter}");
    expect(onSelectCase).toHaveBeenCalledWith(
      expect.objectContaining({ id: expect.any(String), kind: "pr" }),
    );
    expect((box as HTMLInputElement).value).toBe("");
  });

  it("says when nothing matches", async () => {
    const user = userEvent.setup();
    render(<HeaderSearch cases={cases} onSelectCase={() => {}} files={null} />);
    await user.type(screen.getByRole("combobox"), "zzzz");
    expect(screen.getByText("No matches")).toBeTruthy();
  });

  it("closes on Escape without letting the key reach the case underneath", async () => {
    const user = userEvent.setup();
    const outer = vi.fn();
    render(
      <div onKeyDown={outer}>
        <HeaderSearch cases={cases} onSelectCase={() => {}} files={null} />
      </div>,
    );
    const box = screen.getByRole("combobox");
    await user.type(box, "retries");
    expect(box.getAttribute("aria-expanded")).toBe("true");
    fireEvent.keyDown(box, { key: "Escape" });
    expect(box.getAttribute("aria-expanded")).toBe("false");
    expect(outer).not.toHaveBeenCalledWith(expect.objectContaining({ key: "Escape" }));
  });

  it("focuses on ⌘K", () => {
    render(<HeaderSearch cases={cases} onSelectCase={() => {}} files={null} />);
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(document.activeElement).toBe(screen.getByRole("combobox"));
  });
});
