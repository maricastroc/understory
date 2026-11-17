import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import type { Locale } from "@/i18n/locales";
import {
  SYNTHETIC_FILE_PATH,
  syntheticChargeLines,
} from "../line-investigation/fixtures/synthetic-charge-file";
import { datumToken } from "../line-investigation/specimen/datum-token";
import { CodeViewer } from "./CodeViewer";
import { InvestigationPath } from "./InvestigationPath";
import { QuestionForm } from "./QuestionForm";
import { StageHeading } from "./StageHeading";
import type { PathStep } from "./types/path-step";

const STEPS: PathStep[] = [
  { key: "repo", label: "repository", value: "acme/payments", state: "done", onPick: () => {} },
  { key: "file", label: "file", value: "charge.ts", state: "done", onPick: () => {} },
  { key: "line", label: "line", value: null, state: "current", onPick: null },
  { key: "question", label: "question", value: null, state: "next", onPick: null },
];

const inLocale = (ui: React.ReactNode, locale: Locale = "en") =>
  render(<LocaleProvider locale={locale}>{ui}</LocaleProvider>);

const form = (asked: { token: string; line: number } | null, locale: Locale = "en") =>
  inLocale(
    <QuestionForm
      target="line 9"
      runLabel="Investigate line 9"
      question="Why exactly 3 retries?"
      setQuestion={() => {}}
      onRun={() => {}}
      wider={null}
      onRunWider={() => {}}
      asked={asked}
    />,
    locale,
  );

describe("the composer in the landing's language", () => {
  it("numbers its steps in boxes: outlined when done, filled when current, dashed ahead", () => {
    const { container } = inLocale(<InvestigationPath steps={STEPS} />);
    const boxes = [...container.querySelectorAll("li > span[aria-hidden] > span:first-child")];
    expect(boxes.map((b) => b.textContent)).toEqual(["01", "02", "03", "04"]);
    expect(boxes[0].className).toContain("border-li-ink");
    expect(boxes[0].className).not.toContain("bg-li-ink");
    expect(boxes[2].className).toContain("bg-li-ink");
    expect(boxes[3].className).toContain("border-dashed");
    expect(container.querySelector('[aria-current="step"]')!.textContent).toContain("03 line");
    expect(container.querySelector(".bg-li-datum-strong")).toBeNull();
  });

  it("titles the stage in the display face, without a fade", () => {
    render(<StageHeading title="Ask about line 9" lead="The answer follows its history." />);
    const heading = screen.getByRole("heading", { level: 2, name: "Ask about line 9" });
    expect(heading.className).toContain("font-li-display");
    expect(heading.className).not.toMatch(/animate-/);
  });

  it("names the token the question asks about", () => {
    form({ token: "3", line: 9 });
    expect(screen.getByText("asked of the token 3 · line 9")).toBeTruthy();
  });

  it("names it in Portuguese too", () => {
    form({ token: "3", line: 9 }, "pt-BR");
    expect(screen.getByText("pergunta sobre o token 3 · linha 9")).toBeTruthy();
  });

  it("says nothing when the question names no token on the line", () => {
    const { container } = form(null);
    expect(container.textContent).not.toMatch(/asked of/);
  });

  it("holds the line numbers and the selection edge in place when the code scrolls sideways", () => {
    const { container } = inLocale(
      <CodeViewer
        file={{ path: SYNTHETIC_FILE_PATH, lines: syntheticChargeLines }}
        selectedStart={9}
        selectedEnd={9}
        enclosing={null}
        onSelect={() => {}}
        asked={datumToken("Why exactly 3 retries?", syntheticChargeLines[8])}
      />,
    );
    const gutters = [...container.querySelectorAll<HTMLElement>("[data-gutter]")];
    expect(gutters.length).toBeGreaterThan(9);
    for (const g of gutters) expect(g.className).toMatch(/\bsticky left-0\b/);
    const selected = gutters.find((g) => g.textContent === "9")!;
    expect(selected.className).toContain("border-li-datum");
    expect(selected.className).toContain("bg-li-datum-row");
    expect(gutters.find((g) => g.textContent === "8")!.className).toContain("bg-li-neutral-100");
    expect(selected.closest("button")!.className).not.toMatch(/border-l-/);
    expect(container.querySelector("mark[data-asked]")!.textContent).toBe("3");
  });
});
