import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "@/test/axe";
import {
  SYNTHETIC_FILE_PATH,
  syntheticChargeBlame,
  syntheticChargeLines,
} from "../fixtures/synthetic-charge-file";
import { SYNTHETIC_NOW } from "../fixtures/synthetic-retry-cap";
import { CodeSpecimen } from "./CodeSpecimen";
import type { BlameStatus, SpecimenLayout } from "./types";
import { SPECIMEN_LAYOUTS } from "./use-specimen-layout";

const NOW = Date.parse(SYNTHETIC_NOW);

function Harness({
  question = "Why exactly 3 retries?",
  blameStatus = "ready",
  layout = SPECIMEN_LAYOUTS.wide,
  onDatumY,
}: {
  question?: string;
  blameStatus?: BlameStatus;
  layout?: SpecimenLayout;
  onDatumY?: (y: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <CodeSpecimen
      path={SYNTHETIC_FILE_PATH}
      lines={syntheticChargeLines}
      datum={{ start: 9, end: 9 }}
      question={question}
      blame={blameStatus === "unpinned" ? null : syntheticChargeBlame}
      blameStatus={blameStatus}
      now={NOW}
      layout={layout}
      expanded={expanded}
      onToggleExpanded={() => setExpanded((v) => !v)}
      onDatumY={onDatumY}
    />
  );
}

const rows = (container: HTMLElement) => [...container.querySelectorAll("li[data-line]")];
const bars = (container: HTMLElement) => [...container.querySelectorAll("[data-tone]")];

describe("CodeSpecimen — default panel", () => {
  it("shows the v4 window: lines 1–19 and a collapsed tail named after its symbol", () => {
    const { container } = render(<Harness />);
    expect(rows(container).map((r) => r.getAttribute("data-line"))).toEqual(
      Array.from({ length: 19 }, (_, i) => String(i + 1)),
    );
    expect(screen.getByRole("button", { name: "⋯ lines 20–24 · isTransient()" })).toHaveProperty(
      "ariaExpanded",
      "false",
    );
  });

  it("marks the investigated line and boxes the literal the question names", () => {
    const { container } = render(<Harness />);
    const datum = container.querySelector("li[data-datum]")!;
    expect(datum.getAttribute("data-line")).toBe("9");
    expect(datum.querySelector("mark")?.textContent).toBe("3");
    expect(within(datum as HTMLElement).getByText(/investigated line/)).toBeTruthy();
  });

  it("highlights the whole row with no token box when the question names nothing on the line", () => {
    const { container } = render(<Harness question="Why is this line the way it is?" />);
    expect(container.querySelector("li[data-datum]")).not.toBeNull();
    expect(container.querySelector("mark")).toBeNull();
  });

  it("draws one blame bar per non-blank line with datum and same-commit tones", () => {
    const { container } = render(<Harness />);
    const all = bars(container);
    expect(all).toHaveLength(17);
    expect(all.filter((b) => b.getAttribute("data-tone") === "datum")).toHaveLength(1);
    expect(all.filter((b) => b.getAttribute("data-tone") === "same-commit")).toHaveLength(3);
    expect(all[0].getAttribute("title")).toBe("7be210e · 5y 3m");
  });

  it("describes each row's blame in text, not only in a tooltip", () => {
    render(<Harness />);
    expect(
      screen.getByText("Line 9, investigated line, last changed by 92f6a3f, 3 years 6 months ago."),
    ).toBeTruthy();
    expect(screen.getByText("Line 4.")).toBeTruthy();
  });

  it("reports the datum y so the rule can meet the line's bottom edge", () => {
    const onDatumY = vi.fn();
    const { container } = render(<Harness onDatumY={onDatumY} />);
    expect(onDatumY).toHaveBeenLastCalledWith(281);
    expect(container.querySelector("section")?.getAttribute("data-datum-y")).toBe("281");
  });

  it("has no axe violations", async () => {
    const { container } = render(<Harness />);
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});

describe("CodeSpecimen — expansion", () => {
  it("expands and collapses from the keyboard", async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness />);
    await user.tab();
    const toggle = screen.getByRole("button", { name: /lines 20–24/ });
    expect(document.activeElement).toBe(toggle);
    await user.keyboard("{Enter}");
    expect(rows(container)).toHaveLength(24);
    const less = screen.getByRole("button", { name: "Show less" });
    expect(less.getAttribute("aria-expanded")).toBe("true");
    await user.click(less);
    expect(rows(container)).toHaveLength(19);
  });
});

describe("CodeSpecimen — blame states", () => {
  it("never fabricates bars when the case has no pinned revision", () => {
    const { container } = render(<Harness blameStatus="unpinned" />);
    expect(bars(container)).toHaveLength(0);
    expect(screen.getByText("current HEAD, not the investigated revision")).toBeTruthy();
    expect(screen.queryByText("blame")).toBeNull();
  });

  it("hides bars and says so when blame could not be loaded", () => {
    const { container } = render(<Harness blameStatus="unavailable" />);
    expect(bars(container)).toHaveLength(0);
    expect(screen.getByText("blame unavailable for this revision")).toBeTruthy();
  });

  it("keeps bars it already has while a wider window loads", () => {
    const { container } = render(<Harness blameStatus="loading" />);
    expect(bars(container).length).toBeGreaterThan(0);
    expect(screen.getByText("loading blame…")).toBeTruthy();
  });
});

describe("CodeSpecimen — strip", () => {
  it("shows the investigated line ±3 with a 'Show file' control", async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness layout={SPECIMEN_LAYOUTS.strip} />);
    expect(rows(container).map((r) => r.getAttribute("data-line"))).toEqual([
      "6",
      "7",
      "8",
      "9",
      "10",
      "11",
      "12",
    ]);
    await user.click(screen.getByRole("button", { name: "Show file" }));
    expect(rows(container)).toHaveLength(24);
  });

  it("narrows to ±2 on compact screens and stays accessible", async () => {
    const { container } = render(<Harness layout={SPECIMEN_LAYOUTS.compact} />);
    expect(rows(container)).toHaveLength(5);
    expect((await axe(container)).violations).toEqual([]);
  });
});
