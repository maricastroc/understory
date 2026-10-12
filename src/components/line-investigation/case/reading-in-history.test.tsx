import type { DigResult, Evidence } from "@understory/core/types";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { axe } from "@/test/axe";
import kept from "../fixtures/kept-cases.json";
import type { SpecimenSlot } from "../instrument/types";
import { CodeSpecimen } from "../specimen/CodeSpecimen";
import { SPECIMEN_LAYOUTS } from "../specimen/use-specimen-layout";
import { LineInvestigation } from "./LineInvestigation";

const KEPT = kept.cases as unknown as Record<string, DigResult>;
const NOW = Date.parse("2026-10-12T12:00:00Z");

const withEvidence = (id: string, change: (ev: Evidence) => Evidence): DigResult => ({
  ...KEPT[id],
  evidence: change(KEPT[id].evidence),
});

function setup(result: DigResult, reading?: boolean) {
  const { evidence } = result;
  const loc = evidence.location!;
  const code = evidence.code!;
  const slot: SpecimenSlot = (props) => (
    <CodeSpecimen
      path={loc.file}
      lines={code.lines}
      datum={{
        start: loc.startLine - code.startLine + 1,
        end: loc.endLine - code.startLine + 1,
      }}
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

const section = () => document.querySelector<HTMLElement>("#history")!;
const row = (id: string) => document.querySelector<HTMLElement>(`[data-artifact="${id}"]`)!;
const marks = (name: string, within_: ParentNode = document) =>
  [...within_.querySelectorAll<HTMLElement>(`[data-${name}]`)].map((e) => e.textContent);
const markup = () => section().innerHTML.replace(/id="[^"]*"/g, "");
const summary = () => section().querySelector("h2")!.nextElementSibling!.textContent;

beforeEach(() => window.localStorage.clear());

describe("the history without the reading", () => {
  it("is the history as it was: no facts, scopes, earlier changes or edge", () => {
    const off = setup(KEPT["ng-http-114"]);
    expect(marks("fact")).toEqual([]);
    expect(marks("scope")).toEqual([]);
    expect(marks("earlier")).toEqual([]);
    expect(marks("edge")).toEqual([]);
    expect(summary()).toMatch(/→ origin −\S+ · 1 change · 1 artifact$/);
    expect(section().textContent).toContain("oldest recorded change to line 114 · 18a2e4f");
    expect(screen.getByRole("button", { name: /^History · 1 change over / })).toBeTruthy();
    const untouched = markup();
    off.unmount();
    setup(KEPT["ng-http-114"], false);
    expect(markup()).toBe(untouched);
  });
});

describe("the history with the reading", () => {
  it("says what each change did to the line, on the change's own row", () => {
    setup(KEPT["ws-revert-story"], true);
    expect(marks("fact", row("commit:9da72fa"))).toEqual([
      expect.stringMatching(/^rewrote this line · before: /),
    ]);
    expect(marks("fact", row("commit:90021c7"))).toEqual(["added this line"]);
    expect(marks("fact")).toHaveLength(4);
  });

  it("ties a reason to the line only on the last change, and names the rest as earlier", () => {
    setup(KEPT["ws-revert-story"], true);
    expect(marks("scope", row("commit:9da72fa"))).toEqual(["tied to this line"]);
    expect(marks("scope", row("commit:05a16a3"))).toEqual([
      "said of an earlier change to this line",
    ]);
    expect(marks("scope", row("commit:22e1399"))).toEqual([
      "said of an earlier change to this line",
    ]);
    expect(marks("earlier")).toEqual([]);
    expect(marks("edge")).toEqual([]);
    expect(section().textContent).toContain("oldest recorded change to line 4 · 90021c7");
  });

  it("keeps a review comment made in another file, with its scope and its place", () => {
    setup(KEPT["tslint-257"], true);
    const scopes = marks("scope");
    expect(scopes.length).toBeGreaterThan(0);
    expect(new Set(scopes)).toEqual(
      new Set(["said of the change as a whole · comment made in another file"]),
    );
    expect(document.querySelector('[data-scope="line"]')).toBeNull();
  });

  it("adds the changes found by following the line back once, as history without a reason", async () => {
    const { container } = setup(KEPT["ng-http-114"], true);
    const earlier = screen.getByRole("list", {
      name: "Earlier changes to this line, found by following it back",
    });
    const rows = within(earlier).getAllByRole("listitem");
    expect(rows).toHaveLength(1);
    expect(rows[0].getAttribute("data-earlier")).toBe("commit:2420a0a");
    expect(rows[0].textContent).toContain("2420a0a");
    expect(rows[0].textContent).toContain("added this line");
    expect(rows[0].textContent).toContain(
      "found by following the line back · not read for a reason",
    );
    expect(within(rows[0]).getByText("the commit message").closest("details")!.open).toBe(false);
    expect(rows[0].querySelector("[data-scope]")).toBeNull();
    expect(document.querySelectorAll('[data-artifact="commit:2420a0a"]')).toHaveLength(0);
    expect(document.querySelectorAll('[data-artifact="commit:18a2e4f"]')).toHaveLength(1);
    expect(summary()).toMatch(/→ origin −\S+ · 2 changes · 1 artifact$/);
    expect(screen.getByRole("button", { name: /^History · 2 changes over / })).toBeTruthy();
    expect(section().textContent).not.toContain("oldest recorded change");
    expect(marks("edge")).toEqual([]);
    expect((await axe(container)).violations).toEqual([]);
  });

  it("says the earlier history was not read where the walk was not made", () => {
    setup(
      withEvidence("ng-http-114", (ev) => ({ ...ev, lineage: undefined })),
      true,
    );
    expect(marks("edge")).toEqual(["The line's history before this was not read."]);
    expect(summary()).toMatch(/→ oldest read −\S+ · 1 change · 1 artifact$/);
    expect(section().textContent).not.toContain("oldest recorded change");
    expect(marks("fact")).toEqual([expect.stringMatching(/^rewrote this line · before: /)]);
  });

  it("says why where the walk stopped short of the line's first change", async () => {
    const { container } = setup(
      withEvidence("ng-http-114", (ev) => ({
        ...ev,
        lineage: { entries: ev.lineage!.entries.slice(0, 1), stopped: "request limit" },
      })),
      true,
    );
    expect(marks("edge")).toEqual([
      "The line's history before this was not read: it goes further back than this view follows.",
    ]);
    expect(marks("earlier")).toEqual([]);
    expect((await axe(container)).violations).toEqual([]);
  });

  it("keeps the origin where the last change added the line and nothing came before", () => {
    setup(
      withEvidence("ng-http-411", (ev) => ({ ...ev, lineage: undefined })),
      true,
    );
    expect(marks("fact")).toEqual(["added this line"]);
    expect(marks("edge")).toEqual([]);
    expect(section().textContent).toContain("oldest recorded change to line 411 · 1e90d03");
  });
});
