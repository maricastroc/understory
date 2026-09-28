import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "@/test/axe";
import { HeroDemo } from "./HeroDemo";

vi.mock("../../line-investigation/fonts", () => ({ lineInvestigationFonts: "", displayFont: "" }));

const demo = () =>
  screen.getByRole("region", {
    name: /^Example investigation of src\/billing\/charge\.ts line 9$/,
  });
const clauseButtons = (text: RegExp) => within(demo()).getAllByRole("button", { name: text });

describe("HeroDemo", () => {
  it("opens on clause 2 and keeps a clause active after the pointer leaves", () => {
    render(<HeroDemo />);
    for (const b of clauseButtons(/212 customers/))
      expect(b.getAttribute("aria-pressed")).toBe("true");
    const review = clauseButtons(/Review cut/)[0];
    fireEvent.mouseEnter(review);
    fireEvent.mouseLeave(review);
    for (const b of clauseButtons(/Review cut/))
      expect(b.getAttribute("aria-pressed")).toBe("true");
    for (const b of clauseButtons(/212 customers/))
      expect(b.getAttribute("aria-pressed")).toBe("false");
  });

  it("frames the case like the app: file, line and the question asked", () => {
    render(<HeroDemo />);
    expect(demo().textContent).toContain("src/billing/charge.ts");
    expect(demo().textContent).toContain("line 9");
    expect(demo().textContent).toContain("Why exactly 3 retries?");
  });

  it("has no drawer, pin reset, tooltips or clickable history", () => {
    render(<HeroDemo />);
    expect(within(demo()).queryByRole("button", { name: /Clear/ })).toBeNull();
    expect(within(demo()).queryByRole("tooltip")).toBeNull();
    for (const history of within(demo()).getAllByRole("list", { name: "History, newest first" })) {
      expect(within(history).queryAllByRole("button")).toHaveLength(0);
    }
    fireEvent.click(clauseButtons(/Capped at 3/)[0]);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(within(demo()).queryAllByRole("button", { name: /lines? \d/ })).toHaveLength(0);
  });

  it("names every artifact in the history for screen readers", () => {
    render(<HeroDemo />);
    const history = within(demo()).getAllByRole("list", { name: "History, newest first" })[0];
    expect(history.textContent).toContain("issue issue:1187");
    expect(history.textContent).toContain(
      "Not recorded: no pull request, review or issue before commit 7be210e",
    );
  });

  it.each([
    ["wide", ".min-\\[900px\\]\\:hidden"],
    ["vertical", ".max-\\[900px\\]\\:hidden"],
  ])("passes axe in its %s form", async (_, hiddenByCss) => {
    const { container } = render(<HeroDemo />);
    container.querySelector<HTMLElement>(hiddenByCss)!.style.display = "none";
    expect((await axe(container)).violations).toEqual([]);
  });
});
