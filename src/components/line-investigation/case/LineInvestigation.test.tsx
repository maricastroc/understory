import type { DigResult } from "@understory/core/types";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "@/test/axe";
import {
  SYNTHETIC_FILE_PATH,
  syntheticChargeBlame,
  syntheticChargeLines,
} from "../fixtures/synthetic-charge-file";
import { SYNTHETIC_NOW, syntheticRetryCap } from "../fixtures/synthetic-retry-cap";
import * as states from "../fixtures/synthetic-states";
import type { SpecimenSlot } from "../instrument/types";
import { CodeSpecimen } from "../specimen/CodeSpecimen";
import { SPECIMEN_LAYOUTS } from "../specimen/use-specimen-layout";
import { LineInvestigation } from "./LineInvestigation";

const NOW = Date.parse(SYNTHETIC_NOW);

const slot: SpecimenSlot = (props) => (
  <CodeSpecimen
    path={SYNTHETIC_FILE_PATH}
    lines={syntheticChargeLines}
    datum={{ start: 9, end: 9 }}
    question="Why exactly 3 retries?"
    blame={syntheticChargeBlame}
    blameStatus="ready"
    now={NOW}
    {...props}
  />
);

function setup(result: DigResult = syntheticRetryCap, extra: { onDrill?: () => void } = {}) {
  return render(
    <LineInvestigation
      result={result}
      pending={false}
      now={NOW}
      layout={SPECIMEN_LAYOUTS.wide}
      renderSpecimen={slot}
      onDrill={extra.onDrill}
      onFollowUp={() => {}}
    />,
  );
}

const clause = (n: number) =>
  screen
    .getAllByRole("button", { pressed: false })
    .concat(screen.queryAllByRole("button", { pressed: true }))
    .find((b) => b.closest("li[data-clause]")?.getAttribute("data-clause") === `c${n}`)!;
const history = () => screen.getByRole("list", { name: "History, newest first" });

beforeEach(() => window.localStorage.clear());

describe("LineInvestigation — default", () => {
  it("shows the question, verdict, clauses with full-text names and the history in depth order", () => {
    setup();
    expect(screen.getByRole("heading", { level: 1, name: "Why exactly 3 retries?" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Resolved/ })).toBeTruthy();
    expect(clause(1).textContent).toContain(
      "The cap followed an unbounded retry loop that charged 212 customers twice",
    );
    const labels = within(history())
      .getAllByRole("button")
      .map((b) => b.getAttribute("aria-label"));
    expect(labels[0]).toBe("A, commit 92f6a3f, 15 Mar 2023, cited by clause 1, quote verified");
    expect(labels.at(-1)).toBe(
      "Not recorded: no pull request, review or issue before commit 7be210e",
    );
    expect(screen.getByText("hover a clause to see its evidence")).toBeTruthy();
  });

  it("describes clause → evidence relations as text", () => {
    setup();
    const described = document.getElementById(clause(1).getAttribute("aria-describedby")!);
    expect(described?.textContent).toBe(
      "Supported by E, issue issue:1187; D, pull request pr:812. 1 quote verified.",
    );
  });

  it("has no axe violations", async () => {
    const { container } = setup();
    expect((await axe(container)).violations).toEqual([]);
  });
});

describe("LineInvestigation — clauses", () => {
  it("previews on focus and reveals only the cited artifacts' details", () => {
    setup();
    fireEvent.focus(clause(1));
    expect(
      within(history()).getByText("Customers double-billed during Stripe outage"),
    ).toBeTruthy();
    expect(within(history()).queryByText("Cap charge retries at 3, add backoff")).toBeNull();
  });

  it("pins on click, shows Clear, and unpins with Escape", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(clause(1));
    expect(clause(1).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("tracing clause 2 · other evidence dimmed")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Clear · Esc" })).toBeTruthy();
    await user.keyboard("{Escape}");
    expect(clause(1).getAttribute("aria-pressed")).toBe("false");
  });

  it("moves between clauses with the arrow keys", async () => {
    const user = userEvent.setup();
    setup();
    clause(0).focus();
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(clause(1));
    await user.keyboard("{ArrowUp}");
    expect(document.activeElement).toBe(clause(0));
  });
});

describe("LineInvestigation — evidence drawer", () => {
  it("opens an artifact with its verified quote highlighted and steps by depth", async () => {
    const user = userEvent.setup();
    setup();
    const label = within(history()).getByRole("button", { name: /^E, issue/ });
    await user.click(label);
    const drawer = screen.getByRole("dialog", { name: "issue:1187" });
    expect(within(drawer).getByText("212 customers were charged twice").tagName).toBe("MARK");
    expect(within(drawer).getByText("for clause 2")).toBeTruthy();
    expect(document.activeElement?.textContent).toBe("issue:1187");
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("dialog", { name: "7be210e" })).toBeTruthy();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(label);
  });

  it("lists every artifact plus gaps and switches to artifact mode", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "All evidence · 7" }));
    const drawer = screen.getByRole("dialog", { name: "All evidence" });
    expect(within(drawer).getAllByRole("button").length).toBe(8);
    await user.click(within(drawer).getByText("before 7be210e"));
    expect(screen.getByRole("dialog", { name: "before 7be210e" })).toBeTruthy();
    expect(screen.getByText("History silent · recorded: false")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "← All evidence" }));
    expect(screen.getByRole("dialog", { name: "All evidence" })).toBeTruthy();
  });

  it("offers Investigate only when drill-down is possible", async () => {
    const user = userEvent.setup();
    const onDrill = vi.fn();
    setup(syntheticRetryCap, { onDrill });
    await user.click(within(history()).getByRole("button", { name: /^A, commit/ }));
    await user.click(screen.getByRole("button", { name: "Investigate →" }));
    expect(onDrill).toHaveBeenCalledTimes(1);
  });

  it("stays accessible with the drawer open", async () => {
    const user = userEvent.setup();
    const { container } = setup();
    await user.click(within(history()).getByRole("button", { name: /^E, issue/ }));
    expect((await axe(container)).violations).toEqual([]);
  });
});

describe("LineInvestigation — verdict and key", () => {
  it("shows the checklist and confidence only inside the popover", async () => {
    const user = userEvent.setup();
    setup();
    expect(screen.queryByText(/0\.90/)).toBeNull();
    await user.click(screen.getByRole("button", { name: /Resolved/ }));
    const pop = screen.getByRole("dialog", { name: "Why this is resolved" });
    expect(within(pop).getByText("3 quotes found verbatim, 0 misattributed")).toBeTruthy();
    expect(within(pop).getByText("0.90 · high")).toBeTruthy();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("toggles the key and remembers it", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "Key" }));
    expect(screen.getByRole("list", { name: "Key" })).toBeTruthy();
    expect(window.localStorage.getItem("gi:li-key-open")).toBe("1");
  });
});

describe("LineInvestigation — honesty states", () => {
  it("renders a whole-answer abstention as one silent clause", () => {
    setup(states.syntheticNotRecorded());
    expect(screen.getByRole("button", { name: "Not recorded" })).toBeTruthy();
    expect(clause(0).textContent).toContain(
      "The history does not explain why the charge is retried at all.",
    );
  });

  it("says there is no reconstruction when only evidence came back", () => {
    setup(states.syntheticEvidenceOnly());
    expect(screen.getByText("No reconstruction. The evidence below is complete.")).toBeTruthy();
    expect(screen.getByText(/rate-limited/)).toBeTruthy();
  });

  it("shows out-of-scope explicitly", () => {
    setup(states.syntheticOutOfScope());
    expect(screen.getByRole("button", { name: /Out of scope/ })).toBeTruthy();
    expect(
      screen.getByText("This question is outside what this code's history can answer."),
    ).toBeTruthy();
  });

  it("never shows ∅ for a gap that was not searched", () => {
    setup(states.syntheticWithoutStageFourData());
    expect(within(history()).getByRole("button", { name: /^Not verified:/ })).toBeTruthy();
    expect(within(history()).queryByText("not recorded")).toBeNull();
  });

  it("strikes through a citation that was never collected", () => {
    setup(states.syntheticFabricated());
    expect(screen.getByRole("button", { name: /Fabrication caught/ })).toBeTruthy();
    expect(screen.getAllByText("commit:deadbee").some((el) => el.tagName === "S")).toBe(true);
  });
});

describe("LineInvestigation — pending", () => {
  it("shows skeleton rows over the collected evidence", () => {
    render(
      <LineInvestigation
        result={{ evidence: syntheticRetryCap.evidence, narrative: null }}
        pending
        now={NOW}
        layout={SPECIMEN_LAYOUTS.wide}
        renderSpecimen={slot}
      />,
    );
    expect(screen.getByRole("status").textContent).toContain("Reconstructing from 6 artifacts…");
    act(() => {});
  });
});

const draft: DigResult = {
  evidence: {
    question: "Why exactly 3 retries?",
    repo: { path: "synthetic/payments-service" },
    location: { file: SYNTHETIC_FILE_PATH, startLine: 9, endLine: 9 },
    artifacts: [],
    contradictions: [],
  },
  narrative: null,
};

function renderPhase(phase: "collecting" | "failed", result: DigResult = draft) {
  const onRetry = vi.fn();
  const utils = render(
    <LineInvestigation
      result={result}
      pending
      now={NOW}
      layout={SPECIMEN_LAYOUTS.wide}
      renderSpecimen={slot}
      phase={phase}
      failure={
        phase === "failed" ? (
          <button type="button" onClick={onRetry}>
            Try again
          </button>
        ) : undefined
      }
    />,
  );
  return { ...utils, onRetry };
}

describe("LineInvestigation — before the evidence arrives", () => {
  it("shows the question, the code and the datum while collecting, and nothing it does not know", async () => {
    const { container } = renderPhase("collecting");
    expect(screen.getByRole("heading", { level: 1, name: "Why exactly 3 retries?" })).toBeTruthy();
    expect(screen.getByRole("region", { name: `Code, ${SYNTHETIC_FILE_PATH}` })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Collecting the line's history…");
    expect(screen.getByText("Collecting")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Resolved|Reconstructing/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /All evidence/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Ask a follow-up" })).toBeNull();
    expect(screen.queryByRole("list", { name: "History, newest first" })).toBeNull();
    expect((await axe(container)).violations).toEqual([]);
  });

  it("keeps the instrument and offers a retry when the investigation fails", async () => {
    const user = userEvent.setup();
    const { onRetry } = renderPhase("failed");
    expect(screen.getByText("Failed")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("fades the history in, top to bottom, when the evidence arrives in the same view", () => {
    const { rerender } = renderPhase("collecting");
    rerender(
      <LineInvestigation
        result={{ evidence: syntheticRetryCap.evidence, narrative: null }}
        pending
        now={NOW}
        layout={SPECIMEN_LAYOUTS.wide}
        renderSpecimen={slot}
      />,
    );
    const arriving = within(history())
      .getAllByRole("listitem")
      .filter((li) => li.classList.contains("animate-li-arrive"));
    const delays = arriving.map((li) => Number.parseInt(li.style.animationDelay, 10));
    expect(delays.length).toBeGreaterThan(1);
    expect([...delays].sort((a, b) => a - b)).toEqual(delays.map((_, i) => i * 60));
    const shallowest = arriving.find((li) =>
      within(li).queryByRole("button", { name: /^A, commit/ }),
    );
    expect(shallowest?.style.animationDelay).toBe("0ms");
  });

  it("does not animate a saved case that opens with its evidence", () => {
    setup();
    expect(document.querySelector(".animate-li-arrive")).toBeNull();
  });
});

describe("LineInvestigation — no history", () => {
  it("says what was read, draws no bore and offers no empty evidence list", () => {
    setup(states.syntheticNoHistory());
    expect(screen.getByText("No history was found for this line.")).toBeTruthy();
    expect(screen.getByText(/read 4e1d0a2 and found no commit/)).toBeTruthy();
    expect(screen.queryByRole("list", { name: "History, newest first" })).toBeNull();
    expect(screen.queryByRole("button", { name: /All evidence/ })).toBeNull();
    expect(document.querySelector("li[data-clause]")).toBeNull();
  });
});

describe("LineInvestigation — a long history", () => {
  const fold = () =>
    within(history())
      .getAllByRole("button")
      .find(
        (b) => b.hasAttribute("aria-expanded") && /history/.test(b.getAttribute("aria-label")!),
      );
  const names = () =>
    within(history())
      .getAllByRole("button")
      .map((b) => b.getAttribute("aria-label")!);

  it("shows each absence as a chip on the row it belongs to", () => {
    setup();
    const chip = within(history()).getByRole("button", {
      name: "Not recorded: no pull request, review or issue before commit 7be210e",
    });
    expect(chip.textContent).toBe("∅ PR");
    expect(
      within(chip.closest("li")!).getByRole("button", { name: /^F, commit 7be210e/ }),
    ).toBeTruthy();
  });

  it("folds the oldest rows behind a count and opens them on request", () => {
    setup(states.syntheticManyOwners(8));
    const more = fold()!;
    expect(more.getAttribute("aria-expanded")).toBe("false");
    expect(more.getAttribute("aria-label")).toMatch(
      /^Show \d+ more in the history: \d+ commits, \d+ PRs$/,
    );
    expect(names().some((n) => n.includes("commit 7be210e"))).toBe(false);

    fireEvent.click(more);
    expect(fold()!.getAttribute("aria-expanded")).toBe("true");
    expect(fold()!.getAttribute("aria-label")).toBe("Show less of the history");
    expect(names().some((n) => n.includes("commit 7be210e"))).toBe(true);

    fireEvent.click(fold()!);
    expect(fold()!.getAttribute("aria-expanded")).toBe("false");
  });

  it("opens by itself when a clause cites something folded away", async () => {
    const user = userEvent.setup();
    setup(states.syntheticManyOwners(8));
    expect(clause(3).textContent).toContain("The retry loop itself came earlier");
    await user.click(clause(3));
    expect(names().some((n) => /^\w+, commit 7be210e, .*cited by clause 4/.test(n))).toBe(true);
    expect(fold()).toBeUndefined();
  });

  it("has no axe violations while folded", async () => {
    const { container } = setup(states.syntheticManyOwners(8));
    expect(fold()).toBeTruthy();
    expect((await axe(container)).violations).toEqual([]);
  });
});
