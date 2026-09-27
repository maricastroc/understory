import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "@/test/axe";
import { FileStage } from "./FileStage";
import {
  syntheticCaseCounts,
  syntheticMeta,
  syntheticOverview,
} from "./fixtures/synthetic-overview";
import { SYNTHETIC_MAP_STATES } from "./fixtures/synthetic-histories";

function setup(query = "", onOpen = vi.fn(), state = "cold") {
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
      map={SYNTHETIC_MAP_STATES[state]()}
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
    expect(screen.getByRole("button", { name: "Map 14 more" }).hasAttribute("disabled")).toBe(
      false,
    );
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

  it("draws mapped files as solid cores with one mark per blame commit, in three lookup states", () => {
    const { container } = setup("", vi.fn(), "warm");
    expect(screen.getByText("14 of 14 mapped")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Map \d+ more$/ })).toBeNull();
    expect(
      screen.getByText(/% of lines in 14 mapped files have a PR · \d+% not checked$/),
    ).toBeTruthy();
    expect(container.querySelectorAll("svg line[stroke-dasharray='3 3']")).toHaveLength(0);
    expect(container.querySelectorAll("rect.fill-li-evidence-tint").length).toBeGreaterThan(10);
    expect(container.querySelectorAll("rect.stroke-li-gap").length).toBeGreaterThan(5);
    expect(container.querySelectorAll("rect.fill-li-paper.stroke-li-neutral-500")).toHaveLength(2);
    expect(
      files().getByRole("button", {
        name: /^src\/billing\/charge\.ts, oldest surviving line 5 years 3 months, 3 cases$/,
      }),
    ).toBeTruthy();
    fireEvent.focus(files().getByRole("button", { name: /^config\/env\.ts/ }));
    expect(
      screen.getByText("Oldest surviving line: 5y 3m. 3 commits own its 20 lines at HEAD."),
    ).toBeTruthy();
    expect(screen.getByText("60% no PR · 40% not checked (of lines)")).toBeTruthy();
  });

  it("never draws unknown as absence: failed lookups are neutral, unavailable files stay stubs", () => {
    const { container } = setup("", vi.fn(), "unknown");
    const router = container.querySelectorAll("svg g")[2];
    expect(router).toBeTruthy();
    fireEvent.focus(files().getByRole("button", { name: /^src\/webhooks\/router\.ts/ }));
    expect(screen.getByText("100% not checked (of lines)")).toBeTruthy();
    fireEvent.focus(
      files().getByRole("button", { name: /^src\/webhooks\/verify\.ts, history unavailable$/ }),
    );
    expect(
      screen.getByText("History unavailable. It can still be opened and investigated."),
    ).toBeTruthy();
    fireEvent.focus(
      files().getByRole("button", { name: /^tests\/webhooks\.spec\.ts, too large to map$/ }),
    );
    expect(
      screen.getByText("Too large to map. It can still be opened and investigated."),
    ).toBeTruthy();
    fireEvent.focus(
      files().getByRole("button", {
        name: /^src\/webhooks\/legacy\.ts, oldest surviving line at least/,
      }),
    );
    expect(
      screen.getByText(/^Oldest surviving line: ≥ 5y 4m\..*History cut at clone depth\.$/),
    ).toBeTruthy();
  });

  it("marks files being mapped with steel stubs and counts them", () => {
    const { container } = setup("", vi.fn(), "mapping");
    expect(screen.getByText("6 of 14 mapped · mapping 8")).toBeTruthy();
    expect(container.querySelectorAll("line.stroke-li-steel[data-status='mapping']")).toHaveLength(
      8,
    );
  });

  it("passes axe", async () => {
    const { container } = setup();
    expect((await axe(container)).violations).toEqual([]);
  });
});
