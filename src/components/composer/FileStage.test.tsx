import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "@/test/axe";
import { FileStage } from "./FileStage";
import {
  syntheticCaseCounts,
  syntheticMeta,
  syntheticOverview,
} from "./fixtures/synthetic-overview";

function setup(query = "", onOpen = vi.fn()) {
  const view = render(
    <FileStage
      meta={syntheticMeta}
      overview={syntheticOverview}
      overviewError={null}
      caseCounts={syntheticCaseCounts}
      query={query}
      onQuery={() => {}}
      results={[]}
      searching={false}
      onOpen={onOpen}
    />,
  );
  return { ...view, onOpen };
}

const files = () => within(screen.getByRole("list", { name: "Files shown" }));

describe("FileStage — history of current lines, cold", () => {
  it("states the scope, the mapped count and draws one stub per file from the tree alone", () => {
    const { container } = setup();
    expect(screen.getByRole("heading", { name: "History of current lines" })).toBeTruthy();
    expect(
      screen.getByText(
        "14 of 1,284 files: 12 changed in the last 12 commits, 2 with your cases. Not a sample of the whole repository.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("0 of 14 mapped")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Map 14 more" }).hasAttribute("disabled")).toBe(true);
    expect(container.querySelectorAll("svg line[stroke-dasharray='3 3']")).toHaveLength(14);
    expect(container.textContent).toContain("4e1d0a225 Sep2026");
    expect(container.textContent).not.toMatch(/today/);
  });

  it("names every file with its state and cases, and opens it on click", () => {
    const { onOpen } = setup();
    const charge = files().getByRole("button", {
      name: "src/billing/charge.ts, history not mapped yet, 3 cases",
    });
    fireEvent.click(charge);
    expect(onOpen).toHaveBeenCalledWith("src/billing/charge.ts");
    expect(files().getAllByRole("button")).toHaveLength(14);
  });

  it("explains why a file is shown on hover or focus", () => {
    setup();
    fireEvent.focus(files().getByRole("button", { name: /^src\/billing\/charge\.ts/ }));
    expect(screen.getByText("Shown because you have cases here.")).toBeTruthy();
    expect(screen.getByText("History not mapped yet.")).toBeTruthy();
    fireEvent.focus(files().getByRole("button", { name: /^config\/flags\.ts/ }));
    expect(screen.getByText("Shown because it changed in the last 12 commits.")).toBeTruthy();
  });

  it("dims the files that do not match the search and counts matches", () => {
    setup("webhook");
    expect(screen.getByText("4 of 14 shown")).toBeTruthy();
    const opacity = (name: RegExp) =>
      files().getByRole("button", { name }).closest("li")!.style.opacity;
    expect(opacity(/^src\/webhooks\/router\.ts/)).toBe("1");
    expect(opacity(/^src\/billing\/charge\.ts/)).toBe("0.15");
  });

  it("passes axe", async () => {
    const { container } = setup();
    expect((await axe(container)).violations).toEqual([]);
  });
});
