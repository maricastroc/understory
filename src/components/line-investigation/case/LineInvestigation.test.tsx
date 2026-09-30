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
import { syntheticCases } from "../fixtures/synthetic-cases";
import { AnchorSpecimen } from "../answer/AnchorSpecimen";
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
  document.querySelector<HTMLButtonElement>(`li[data-clause="c${n}"] > button`)!;
const history = () => screen.getByRole("list", { name: "History, newest first" });
const evidence = () => screen.getByRole("region", { name: /^EVIDENCE · CLAUSE/ });
const row = (id: string) => document.querySelector<HTMLElement>(`[data-artifact="${id}"]`)!;
const rowButton = (id: string) =>
  row(id).querySelector<HTMLButtonElement>("button[aria-expanded]")!;

beforeEach(() => window.localStorage.clear());

describe("LineInvestigation — answer first", () => {
  it("shows the question, verdict and clauses, with the history below and every row named", () => {
    setup();
    expect(screen.getByRole("heading", { level: 1, name: "Why exactly 3 retries?" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Resolved/ })).toBeTruthy();
    expect(clause(1).textContent).toContain(
      "The cap followed an unbounded retry loop that charged 212 customers twice",
    );
    expect(screen.getByText("select a clause to check its evidence")).toBeTruthy();
    expect(rowButton("commit:92f6a3f").getAttribute("aria-label")).toBe(
      "A, commit 92f6a3f, 15 Mar 2023, cited by clause 1, quote verified",
    );
    expect(
      screen.getByRole("note", {
        name: "Not recorded: no pull request, review or issue before commit 7be210e",
      }),
    ).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "History of line 9" })).toBeTruthy();
  });

  it("reads as a whole at rest: up to three lines per clause, the full text kept for assistive tech", () => {
    setup();
    for (const n of [0, 1, 2]) {
      const text = clause(n).querySelector<HTMLElement>(".line-clamp-3")!;
      expect(text.textContent).toBe(
        [
          "Capped at three attempts, with 1 s · 2 s · 4 s backoff.",
          "The cap followed an unbounded retry loop that charged 212 customers twice during a Stripe outage.",
          "Review cut the proposed five to three so retries finish inside Stripe’s 10 s webhook window.",
        ][n],
      );
      expect(within(clause(n)).getByText("2 sources · 1 verified").className).toContain(
        "opacity-0",
      );
    }
  });

  it("inspects a clause on focus, whole and with its tally, and on hover only after a pause", () => {
    vi.useFakeTimers();
    try {
      setup();
      fireEvent.focus(clause(1));
      expect(clause(1).querySelector(".line-clamp-3")).toBeNull();
      expect(within(clause(1)).getByText("2 sources · 1 verified").className).toContain(
        "opacity-100",
      );
      fireEvent.blur(clause(1));
      act(() => vi.advanceTimersByTime(250));
      fireEvent.mouseEnter(clause(2));
      act(() => vi.advanceTimersByTime(60));
      expect(within(clause(2)).getByText("2 sources · 1 verified").className).toContain(
        "opacity-0",
      );
      act(() => vi.advanceTimersByTime(100));
      expect(within(clause(2)).getByText("2 sources · 1 verified").className).toContain(
        "opacity-100",
      );
      fireEvent.mouseLeave(clause(2));
      act(() => vi.advanceTimersByTime(200));
      act(() => vi.advanceTimersByTime(250));
      expect(clause(2).querySelector(".line-clamp-3")).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it("describes clause → evidence relations as text", () => {
    setup();
    const described = document.getElementById(clause(1).getAttribute("aria-describedby")!);
    expect(described?.textContent).toBe(
      "Supported by E, issue issue:1187; D, pull request pr:812. 1 quote verified.",
    );
  });

  it("shows titles and verified quotes in the history at rest", () => {
    setup();
    expect(
      within(history()).getByText("Customers double-billed during Stripe outage"),
    ).toBeTruthy();
    expect(within(history()).getByText("“212 customers were charged twice”")).toBeTruthy();
    expect(within(history()).getByText("wrote line 9 as it reads today")).toBeTruthy();
  });

  it("has no axe violations", async () => {
    const { container } = setup();
    expect((await axe(container)).violations).toEqual([]);
  });
});

describe("LineInvestigation — evidence in place", () => {
  it("previews a clause's sources in the history on focus", () => {
    setup();
    fireEvent.focus(clause(1));
    expect(row("issue:1187").dataset.lit).toBe("true");
    expect(row("pr:812").dataset.lit).toBe("true");
    expect(row("commit:92f6a3f").dataset.lit).toBeUndefined();
  });

  it("opens the evidence of a clause right under it, on its first source", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(clause(1));
    expect(clause(1).getAttribute("aria-expanded")).toBe("true");
    const panel = evidence();
    expect(clause(1).getAttribute("aria-controls")).toBe(panel.id);
    expect(clause(1).closest("li")!.contains(panel)).toBe(true);
    expect(within(panel).getByRole("heading").textContent).toBe("EVIDENCE · CLAUSE 2 · 1 OF 2");
    expect(within(panel).getByText("212 customers were charged twice").tagName).toBe("MARK");
    expect(within(panel).getByText("✓ Quote found verbatim in the source")).toBeTruthy();
    expect(panel.textContent).toContain(
      "issue:1187 → closed by pr:812 → merged as 92f6a3f · wrote line 9 as it reads today",
    );
    expect(screen.getByText("checking clause 2 · Esc returns here")).toBeTruthy();
  });

  it("steps through only that clause's sources, by button, chip and arrow key", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(clause(1));
    await user.click(screen.getByRole("button", { name: "Next source" }));
    expect(evidence().textContent).toContain("Bound retries in chargeCustomer");
    expect(
      within(evidence()).getByText("Cited · the verbatim quote is in another source"),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Next source" }).getAttribute("aria-disabled")).toBe(
      "true",
    );
    await user.keyboard("{ArrowLeft}");
    expect(evidence().textContent).toContain("Customers double-billed during Stripe outage");
    await user.click(within(evidence()).getByRole("button", { name: "D pr:812" }));
    expect(
      within(evidence()).getByRole("button", { name: "D pr:812" }).getAttribute("aria-current"),
    ).toBe("true");
  });

  it("closes with Escape or ✕ and gives focus back to the clause", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(clause(1));
    await user.click(screen.getByRole("button", { name: "Next source" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("region", { name: /^EVIDENCE/ })).toBeNull();
    expect(document.activeElement).toBe(clause(1));
    await user.click(clause(1));
    await user.click(screen.getByRole("button", { name: "Close evidence" }));
    expect(clause(1).getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(clause(1));
  });

  it("shows the source in the history, opened, without closing the answer", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(clause(1));
    await user.click(within(evidence()).getByRole("button", { name: "Show in history ↓" }));
    expect(row("issue:1187").dataset.located).toBe("true");
    expect(rowButton("issue:1187").getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement).toBe(rowButton("issue:1187"));
    expect(clause(1).getAttribute("aria-expanded")).toBe("true");
  });

  it("goes back from a history row to the clause it supports, at that source", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(
      within(row("pr:812")).getByRole("button", {
        name: "Back to clause 2 with pr:812 as its source",
      }),
    );
    expect(clause(1).getAttribute("aria-expanded")).toBe("true");
    expect(evidence().textContent).toContain("Bound retries in chargeCustomer");
    await act(() => new Promise((r) => requestAnimationFrame(() => r(null))));
    expect(document.activeElement).toBe(clause(1));
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

  it("offers Investigate only when drill-down is possible", async () => {
    const user = userEvent.setup();
    const onDrill = vi.fn();
    setup(syntheticRetryCap, { onDrill });
    await user.click(clause(0));
    await user.click(within(evidence()).getByRole("button", { name: "Investigate →" }));
    expect(onDrill).toHaveBeenCalledTimes(1);
    expect(onDrill.mock.calls[0][0].id).toBe("commit:92f6a3f");
  });

  it("opens a history row in place with its source, context and actions", async () => {
    const user = userEvent.setup();
    setup(syntheticRetryCap, { onDrill: () => {} });
    await user.click(rowButton("commit:7be210e"));
    expect(rowButton("commit:7be210e").getAttribute("aria-expanded")).toBe("true");
    expect(
      within(row("commit:7be210e")).getByText("No pull request references this commit"),
    ).toBeTruthy();
    expect(
      within(row("commit:7be210e")).getByRole("button", { name: "Investigate →" }),
    ).toBeTruthy();
  });

  it("stays accessible with the evidence and a row open", async () => {
    const user = userEvent.setup();
    const { container } = setup();
    await user.click(clause(1));
    await user.click(rowButton("commit:7be210e"));
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

describe("LineInvestigation — going back", () => {
  it("offers a way back to the question only when the host can take it", async () => {
    const user = userEvent.setup();
    const onBackToQuestion = vi.fn();
    const { rerender } = setup();
    expect(screen.queryByRole("button", { name: "← Back to question" })).toBeNull();
    rerender(
      <LineInvestigation
        result={syntheticRetryCap}
        pending={false}
        now={NOW}
        layout={SPECIMEN_LAYOUTS.wide}
        renderSpecimen={slot}
        onFollowUp={() => {}}
        onBackToQuestion={onBackToQuestion}
      />,
    );
    await user.click(screen.getByRole("button", { name: "← Back to question" }));
    expect(onBackToQuestion).toHaveBeenCalledOnce();
  });
});

describe("LineInvestigation — a drilled case", () => {
  const drilled = syntheticCases.find((c) => !c.result.evidence.location)!.result;
  const anchor = drilled.evidence.anchor!;
  const renderDrilled = (onOpen = vi.fn()) => {
    const utils = render(
      <LineInvestigation
        result={drilled}
        pending={false}
        now={NOW}
        layout={SPECIMEN_LAYOUTS.wide}
        renderSpecimen={() => (
          <AnchorSpecimen
            anchor={anchor}
            artifact={drilled.evidence.artifacts.find((a) => a.id === anchor.id) ?? null}
            collected={drilled.evidence.artifacts.length}
            now={NOW}
          />
        )}
        parent={{ id: "GI-2049", question: "Why exactly 3 retries?", onOpen }}
      />,
    );
    return { ...utils, onOpen };
  };

  it("shows the artifact it is anchored on where a line case shows code", () => {
    renderDrilled();
    const panel = screen.getByRole("region", { name: "Anchor, review review·dmitri-k" });
    expect(within(panel).getByText("Review by dmitri-k on #812")).toBeTruthy();
    expect(within(panel).getByText("3 artifacts collected around it")).toBeTruthy();
    expect(screen.getByText("anchored on")).toBeTruthy();
  });

  it("names its history after the anchor and never claims anything about a line", () => {
    renderDrilled();
    const section = screen
      .getByRole("heading", { level: 2, name: "Around review·dmitri-k" })
      .closest("section")!;
    expect(section.textContent).not.toMatch(/\bline\b/);
    expect(within(row("review:812-1")).getByText("the review this case asks about")).toBeTruthy();
  });

  it("links back to the case it was drilled from", async () => {
    const user = userEvent.setup();
    const { onOpen } = renderDrilled();
    await user.click(screen.getByRole("button", { name: "GI-2049" }));
    expect(onOpen).toHaveBeenCalledOnce();
    expect(screen.getByText(/drilled from “Why exactly 3 retries\?”/)).toBeTruthy();
  });

  it("has no axe violations", async () => {
    const { container } = renderDrilled();
    expect((await axe(container)).violations).toEqual([]);
  });
});

describe("LineInvestigation — coverage notes", () => {
  it("says when the line fell back to the file's history", () => {
    const note =
      "This file is too large for GitHub's blame API, so line-level history isn't available here.";
    setup({ ...syntheticRetryCap, evidence: { ...syntheticRetryCap.evidence, note } });
    expect(screen.getByText(note)).toBeTruthy();
  });
});

describe("LineInvestigation — honesty states", () => {
  it("renders a whole-answer abstention as one silent clause whose evidence is the silence", async () => {
    const user = userEvent.setup();
    setup(states.syntheticNotRecorded());
    expect(screen.getByRole("button", { name: "Not recorded" })).toBeTruthy();
    expect(clause(0).textContent).toContain(
      "The history does not explain why the charge is retried at all.",
    );
    await user.click(clause(0));
    expect(within(evidence()).getByText("History silent · recorded: false")).toBeTruthy();
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
    expect(rowButton("commit:7be210e").getAttribute("aria-label")).toMatch(/Not verified:/);
    expect(screen.queryByRole("note")).toBeNull();
    expect(within(history()).queryByText(/∅/)).toBeNull();
  });

  it("strikes through a citation that was never collected, in the clause and its evidence", async () => {
    const user = userEvent.setup();
    setup(states.syntheticFabricated());
    expect(screen.getByRole("button", { name: /Fabrication caught/ })).toBeTruthy();
    expect(screen.getAllByText("commit:deadbee").some((el) => el.tagName === "S")).toBe(true);
    const fabricated = [
      ...document.querySelectorAll<HTMLButtonElement>("li[data-clause] > button"),
    ].find((b) => b.closest("li")!.querySelector("s"))!;
    await user.click(fabricated);
    await user.click(within(evidence()).getByRole("button", { name: "commit:deadbee" }));
    expect(within(evidence()).getByText(/never collected/)).toBeTruthy();
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
    expect(screen.queryByRole("button", { name: /^History/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Ask a follow-up" })).toBeNull();
    expect(screen.queryByRole("list", { name: "History, newest first" })).toBeNull();
    expect((await axe(container)).violations).toEqual([]);
  });

  it("keeps the answer and offers a retry when the investigation fails", async () => {
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
    expect(delays).toEqual(delays.map((_, i) => i * 45));
    expect(arriving[0].dataset.stratum).toBe("commit:92f6a3f");
  });

  it("does not animate a saved case that opens with its evidence", () => {
    setup();
    expect(document.querySelector(".animate-li-arrive")).toBeNull();
  });
});

describe("LineInvestigation — no history", () => {
  it("says what was read and offers no empty history", () => {
    setup(states.syntheticNoHistory());
    expect(screen.getByText("No history was found for this line.")).toBeTruthy();
    expect(screen.getByText(/read 4e1d0a2 and found no commit/)).toBeTruthy();
    expect(screen.queryByRole("list", { name: "History, newest first" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^History/ })).toBeNull();
    expect(document.querySelector("li[data-clause]")).toBeNull();
  });
});

describe("LineInvestigation — a long history", () => {
  it("verifies a deep source without opening the rest of the history", async () => {
    const user = userEvent.setup();
    setup(states.syntheticManyOwners(8));
    const fold = screen.getByRole("button", { name: "Show 8" });
    expect(row("commit:b000001")).toBeNull();
    expect(clause(3).textContent).toContain("The retry loop itself came earlier");
    await user.click(clause(3));
    expect(evidence().textContent).toContain("7be210e");
    expect(evidence().textContent).toContain("an earlier change to lines 7–16");
    expect(fold.isConnected).toBe(true);
    expect(row("commit:b000001")).toBeNull();
  });

  it("opens a folded run of uncited changes on request", async () => {
    const user = userEvent.setup();
    setup(states.syntheticManyOwners(8));
    expect(screen.getByText("8 earlier changes not cited by the answer")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Show 8" }));
    expect(row("commit:b000001")).toBeTruthy();
    expect(row("pr:707")).toBeTruthy();
  });

  it("has no axe violations while folded", async () => {
    const { container } = setup(states.syntheticManyOwners(8));
    expect((await axe(container)).violations).toEqual([]);
  });
});
