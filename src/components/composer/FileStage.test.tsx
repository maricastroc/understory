import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "@/test/axe";
import { FileStage } from "./FileStage";
import { syntheticCaseCounts, syntheticOverview } from "./fixtures/synthetic-overview";
import { SYNTHETIC_MAP_STATES } from "./fixtures/synthetic-histories";
import { MAP } from "./history/map-geometry";

function setup(query = "", onOpen = vi.fn(), state = "cold", overview = syntheticOverview) {
  const view = render(
    <FileStage
      overview={overview}
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
const legend = () => screen.getByRole("list", { name: "Legend" }).textContent;
const twoFiles = { ...syntheticOverview, files: syntheticOverview.files.slice(2, 4) };

describe("FileStage — history of current lines, cold", () => {
  it("states the scope, the mapped count and draws one stub per file from the tree alone", () => {
    const { container } = setup();
    expect(screen.getByRole("heading", { name: "History of current lines" })).toBeTruthy();
    expect(screen.getByText("12 changed in the last 12 commits · 2 with your cases")).toBeTruthy();
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

  it("caps a long file name below the folder row instead of letting it run into it", () => {
    const long = {
      ...syntheticOverview,
      files: syntheticOverview.files.map((f, i) =>
        i === 0 ? { ...f, path: "src/billing/AVeryLongStyledNativeComponentName.ts" } : f,
      ),
    };
    setup("", vi.fn(), "cold", long);
    const label = files().getByRole("button", { name: /^src\/billing\/AVeryLong/ });
    expect(label.style.maxWidth).toBe(`${MAP.labelMax}px`);
    expect(label.className).toContain("truncate");
    expect(label.textContent).toBe("AVeryLongStyledNativeComponentName.ts");
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
    expect(screen.queryByText(/of 14 mapped/)).toBeNull();
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

describe("FileStage — quiet by default, detailed on intent", () => {
  it("lists only the legend states present in the map", () => {
    const cold = setup();
    expect(legend()).toBe("not mapped yetyour cases");
    cold.unmount();
    setup("", vi.fn(), "warm");
    expect(legend()).toContain("PR found");
    expect(legend()).toContain("no PR on GitHub");
    expect(legend()).toContain("not checked");
    expect(legend()).not.toContain("not mapped yet");
    expect(legend()).not.toContain("mapping");
  });

  it("keeps the inspector neutral until a file is hovered or focused", () => {
    setup("", vi.fn(), "warm", twoFiles);
    const inspector = within(screen.getByRole("complementary", { name: "File inspector" }));
    expect(inspector.getByText(/^2 files/)).toBeTruthy();
    expect(inspector.getByText("Hover or focus a file to inspect its history.")).toBeTruthy();
    expect(inspector.queryByText("Commits")).toBeNull();
    expect(inspector.queryByRole("button")).toBeNull();
  });

  it("reveals the file history and an open action on focus, and clears on Escape", () => {
    const onOpen = vi.fn();
    setup("", onOpen, "warm", twoFiles);
    const inspector = within(screen.getByRole("complementary", { name: "File inspector" }));
    fireEvent.focus(files().getByRole("button", { name: /^config\/flags\.ts/ }));
    expect(inspector.getByText("Current lines")).toBeTruthy();
    expect(inspector.getByText("Oldest line")).toBeTruthy();
    expect(inspector.getByText("Commits")).toBeTruthy();
    expect(inspector.getByText("Pull requests")).toBeTruthy();
    fireEvent.click(inspector.getByRole("button", { name: "Open flags.ts →" }));
    expect(onOpen).toHaveBeenCalledWith("config/flags.ts");
    fireEvent.keyDown(inspector.getByRole("button", { name: "Open flags.ts →" }), {
      key: "Escape",
    });
    expect(inspector.getByText("Hover or focus a file to inspect its history.")).toBeTruthy();
  });

  it("returns to the neutral reading when the pointer leaves the map", () => {
    const { container } = setup("", vi.fn(), "warm", twoFiles);
    fireEvent.mouseEnter(files().getAllByRole("button")[0]);
    expect(screen.getByRole("button", { name: /^Open / })).toBeTruthy();
    const region = container.querySelector("aside")!.parentElement!.parentElement!;
    fireEvent.mouseLeave(region);
    expect(screen.queryByRole("button", { name: /^Open / })).toBeNull();
  });

  it("keeps the not-a-sample caveat one click away, announced as a disclosure", () => {
    setup();
    const about = screen.getByRole("button", { name: "About this map" });
    expect(about.getAttribute("aria-expanded")).toBe("false");
    const note = document.getElementById(about.getAttribute("aria-controls")!)!;
    expect(note.hidden).toBe(true);
    fireEvent.click(about);
    expect(about.getAttribute("aria-expanded")).toBe("true");
    expect(note.hidden).toBe(false);
    expect(note.textContent).toContain(
      "14 of 1,284 files at HEAD, chosen for the reasons above. Not a sample of the whole repository.",
    );
  });

  it("does not announce missing PR data before a file is picked, but says it on intent", () => {
    setup("", vi.fn(), "warm", { ...twoFiles, prData: "none" });
    expect(screen.queryByText(/PR data unavailable/)).toBeNull();
    const about = screen.getByRole("button", { name: "About this map" });
    const note = document.getElementById(about.getAttribute("aria-controls")!)!;
    expect(note.textContent).toMatch(/PR data is unavailable for this repo/);
    fireEvent.focus(files().getByRole("button", { name: /^config\/flags\.ts/ }));
    expect(screen.getByText("unavailable for this repo")).toBeTruthy();
  });

  it("shows the file count once, in the reading, when every file is mapped", () => {
    setup("", vi.fn(), "warm", twoFiles);
    expect(screen.getByText("Changed in the last 12 commits")).toBeTruthy();
    expect(screen.queryByText(/of 2 mapped/)).toBeNull();
    expect(screen.getAllByText(/\b2 files\b/)).toHaveLength(1);
  });
});

describe("FileStage — a map wider than its box", () => {
  function narrowBox(clientWidth: number) {
    let left = 0;
    const content = { scrollWidth: 0 };
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(clientWidth);
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockImplementation(function (
      this: HTMLElement,
    ) {
      const inner = this.firstElementChild as HTMLElement | null;
      content.scrollWidth = Math.max(clientWidth, parseFloat(inner?.style.width ?? "") || 0);
      return content.scrollWidth;
    });
    vi.spyOn(HTMLElement.prototype, "scrollLeft", "get").mockImplementation(() => left);
    const scrollBy = vi.fn(function (this: HTMLElement, opts: ScrollToOptions) {
      left = Math.min(Math.max(0, left + (opts.left ?? 0)), content.scrollWidth - clientWidth);
      this.dispatchEvent(new Event("scroll"));
    });
    Object.defineProperty(HTMLElement.prototype, "scrollBy", {
      configurable: true,
      value: scrollBy,
    });
    return scrollBy;
  }

  afterEach(() => {
    vi.restoreAllMocks();
    delete (HTMLElement.prototype as { scrollBy?: unknown }).scrollBy;
  });

  it("says how many files are past the edge, at the HEAD line, and pages to them", () => {
    const scrollBy = narrowBox(500);
    setup();
    const region = screen.getByRole("region", {
      name: "History map, scroll sideways for more files",
    });
    const right = screen.getByRole("button", { name: /^Scroll right, \d+ more files$/ });
    const count = Number(right.textContent!.match(/^(\d+) more →$/)![1]);
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(14);
    expect(screen.queryByRole("button", { name: /^Scroll left/ })).toBeNull();
    expect(region.contains(right)).toBe(false);

    fireEvent.click(right);
    expect(scrollBy).toHaveBeenCalledWith({ left: 400, behavior: "smooth" });
    fireEvent.click(screen.getByRole("button", { name: /^Scroll right/ }));
    expect(screen.queryByRole("button", { name: /^Scroll right/ })).toBeNull();
    const back = screen.getByRole("button", { name: /^Scroll left, \d+ more files$/ });
    expect(back.textContent).toMatch(/^← \d+ more$/);
    fireEvent.click(back);
    expect(scrollBy).toHaveBeenLastCalledWith({ left: -400, behavior: "smooth" });
  });

  it("shows no cue when the map fits", () => {
    narrowBox(1120);
    setup();
    expect(screen.queryByRole("region", { name: /scroll sideways/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Scroll (left|right)/ })).toBeNull();
  });
});
