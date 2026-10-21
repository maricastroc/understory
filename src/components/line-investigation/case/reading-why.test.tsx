import type { DigResult } from "@understory/core/types";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "@/test/axe";
import controls from "../fixtures/control-cases.json";
import kept from "../fixtures/kept-cases.json";
import type { SpecimenSlot } from "../instrument/types";
import { CodeSpecimen } from "../specimen/CodeSpecimen";
import { SPECIMEN_LAYOUTS } from "../specimen/use-specimen-layout";
import { LineInvestigation } from "./LineInvestigation";

const CASES = {
  ...(kept.cases as unknown as Record<string, DigResult>),
  ...(controls.cases as unknown as Record<string, DigResult>),
};
const NOW = Date.parse("2026-10-12T12:00:00Z");

function setup(id: string, reading?: boolean) {
  const result = CASES[id];
  const { evidence } = result;
  const loc = evidence.location!;
  const code = evidence.code!;
  const slot: SpecimenSlot = (props) => (
    <CodeSpecimen
      path={loc.file}
      lines={code.lines}
      datum={{ start: loc.startLine - code.startLine + 1, end: loc.endLine - code.startLine + 1 }}
      question={evidence.question}
      blame={null}
      blameStatus="ready"
      now={NOW}
      {...props}
    />
  );
  return render(
    <LineInvestigation
      result={result}
      pending={false}
      now={NOW}
      layout={SPECIMEN_LAYOUTS.wide}
      renderSpecimen={slot}
      onFollowUp={() => {}}
      {...(reading === undefined ? {} : { reading })}
    />,
  );
}

const zone = () => screen.getByRole("region", { name: "What the history supports" });
const changes = () =>
  [...zone().querySelectorAll<HTMLElement>("[data-why-change]")].map((li) => ({
    at: li.getAttribute("data-why-change"),
    head: li.querySelector("p")!.textContent,
  }));
const chip = () => screen.getByRole("button", { name: /^(Resolved|Answered)/ });

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("the why zone without the reading", () => {
  it("is the reconstructed why as it was, with its verdict and the history's wording", () => {
    setup("ng-http-114");
    expect(screen.getByRole("region", { name: "Reconstructed why" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "What the history supports" })).toBeNull();
    expect(chip().textContent).toContain("Resolved");
    expect(chip().querySelector("svg")).not.toBeNull();
    expect(document.querySelector("#history")!.textContent).toContain(
      "Understory does not infer a reason here.",
    );
  });
});

describe("the why zone with the reading", () => {
  it("ng-http-114: a likely explanation of the last change, and a history that tells the same story", () => {
    setup("ng-http-114", true);
    expect(changes()).toEqual([
      { at: "last", head: "last change · 18a2e4f · 23 Jul 2015 · rewrote this line" },
    ]);
    const row = within(zone()).getByRole("button", { name: /index/ });
    expect(row.textContent).toContain("Likely explanation · clause 1");
    expect(zone().textContent).toContain(
      "commit title “fix(httpParamSerializerJQLike): Follow jQuery for index of arrays of objects”",
    );
    expect(zone().textContent).not.toContain("Documented for this line");
    const history = document.querySelector("#history")!.textContent;
    expect(history).not.toContain("Understory does not infer a reason here.");
    expect(history).toContain(
      "Blame reaches 18a2e4f, and no pull request, review or issue was found for it. The commit's own message is all the record holds.",
    );
  });

  it("ws-revert-story: newest first, each reason under its own change, earlier ones named as earlier", () => {
    setup("ws-revert-story", true);
    expect(changes()).toEqual([
      { at: "last", head: "last change · 9da72fa · 18 Mar 2024 · rewrote this line" },
      { at: "earlier", head: "earlier change · 05a16a3 · 11 Mar 2024 · rewrote this line" },
      { at: "earlier", head: "earlier change · 22e1399 · 5 Mar 2024 · rewrote this line" },
    ]);
    const labels = [...zone().querySelectorAll("[data-why-change] button")].map((b) =>
      b.textContent!.replace(/^.*?(Documented for this line|Likely explanation)/, "$1"),
    );
    expect(labels).toEqual([
      "Documented for this line · clause 3",
      "Likely explanation · clause 2",
      "Likely explanation · clause 1",
    ]);
  });

  it("tslint-189: the borrowed reason shown as a likely explanation, with the pull request item it rests on", () => {
    setup("tslint-189", true);
    expect(changes()).toEqual([
      { at: "last", head: "last change · 8b853b2 · 9 Jan 2018 · rewrote this line" },
    ]);
    expect(zone().textContent).toContain("Likely explanation · clause 1");
    expect(zone().textContent).not.toContain("Documented for this line");
    expect(zone().textContent).toContain(
      "pr:3412 description “* formatterLoader * allow uncompiled custom formatters (we already allow uncompiled rules)”",
    );
  });

  it("tslint-257: no reason identified, the change's record kept, the weak claims collapsed", () => {
    setup("tslint-257", true);
    expect(zone().textContent).toContain("No reason for this line is established in the record.");
    expect(changes()).toEqual([
      {
        at: "last",
        head: "last change · 63fc794 · 9 May 2017 · added this linetitled “Rewrite enable/disable logic (#2369)”",
      },
    ]);
    expect(zone().textContent).toContain("From this change's record · clause 3");
    expect(zone().textContent).toContain("review·ajafff · comment made in another file");
    const details = zone().querySelector("details")!;
    expect(details.open).toBe(false);
    expect(details.querySelector("summary")!.textContent).toBe("Not established · 3");
    expect(
      [...details.querySelectorAll("button")].map(
        (b) => b.textContent!.match(/insufficient.*$/)?.[0],
      ),
    ).toEqual(
      [0, 1, 3].map((c) => `insufficient: the cited sources do not say this · clause ${c + 1}`),
    );
  });

  it("opens a sentence's evidence under it, as the clauses did", () => {
    setup("tslint-189", true);
    const row = within(zone()).getByRole("button", { name: /uncompiled custom formatters/ });
    fireEvent.click(row);
    expect(row.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("region", { name: /^EVIDENCE · CLAUSE 1/ })).toBeTruthy();
  });

  it("calls the verdict an answer, without the check, and says what its confidence rates", () => {
    setup("tslint-189", true);
    expect(chip().textContent).toContain("Answered");
    expect(chip().querySelector("svg")).toBeNull();
    fireEvent.click(chip());
    const dialog = screen.getByRole("dialog", { name: "What was checked" });
    expect(dialog.textContent).toContain(
      "It rates the answer's sources, not their link to this line.",
    );
  });

  it("copies the documented and the likely apart, and nothing where no reason is identified", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const { unmount } = setup("ws-revert-story", true);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy the why" }));
    });
    expect(writeText).toHaveBeenCalledTimes(1);
    const text = writeText.mock.calls[0][0] as string;
    expect(text.indexOf("Documented for this line:")).toBe(0);
    expect(text).toContain("Likely explanations:");
    expect(text).toContain("05a16a3, an earlier change, 11 Mar 2024");
    unmount();
    setup("tslint-257", true);
    expect(screen.queryByRole("button", { name: "Copy the why" })).toBeNull();
  });

  for (const id of [
    "q-796",
    "ng-http-114",
    "tslint-257",
    "ng-http-411",
    "ws-revert-story",
    "tslint-189",
  ])
    it(`has no axe violations, ${id}`, async () => {
      const { container } = setup(id, true);
      expect((await axe(container)).violations).toEqual([]);
    });
});
