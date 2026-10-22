import type { DigResult } from "@understory/core/types";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { axe } from "@/test/axe";
import { LineInvestigation } from "../case/LineInvestigation";
import kept from "../fixtures/kept-cases.json";
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

const KEPT = kept.cases as unknown as Record<string, DigResult>;
const NOW = Date.parse(SYNTHETIC_NOW);

const synthetic: SpecimenSlot = (props) => (
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

function keptSlot(result: DigResult): SpecimenSlot {
  const loc = result.evidence.location!;
  const code = result.evidence.code!;
  const KeptSlot: SpecimenSlot = (props) => (
    <CodeSpecimen
      path={loc.file}
      lines={code.lines}
      datum={{ start: loc.startLine - code.startLine + 1, end: loc.endLine - code.startLine + 1 }}
      question={result.evidence.question}
      blame={null}
      blameStatus="ready"
      now={NOW}
      {...props}
    />
  );
  return KeptSlot;
}

function setup(result: DigResult, opts: { reading?: boolean; kept?: boolean } = {}) {
  return render(
    <LocaleProvider locale="pt-BR">
      <LineInvestigation
        result={result}
        pending={false}
        now={NOW}
        layout={SPECIMEN_LAYOUTS.wide}
        renderSpecimen={opts.kept ? keptSlot(result) : synthetic}
        onDrill={() => {}}
        onFollowUp={() => {}}
        {...(opts.reading === undefined ? {} : { reading: opts.reading })}
      />
    </LocaleProvider>,
  );
}

const section = () => document.querySelector<HTMLElement>("#history")!;
const summary = () => section().querySelector("h2")!.nextElementSibling!.textContent;
const history = () =>
  screen.getByRole("list", { name: "Histórico, do mais recente para o mais antigo" });
const row = (id: string) => document.querySelector<HTMLElement>(`[data-artifact="${id}"]`)!;

beforeEach(() => window.localStorage.clear());

describe("the history in Portuguese", () => {
  it("names its extent, its margins and the way back to each clause", () => {
    setup(syntheticRetryCap);
    expect(history()).toBeTruthy();
    expect(summary()).toMatch(/^hoje ±0 → origem −\d+(,\d)?a · \d+ mudanças · \d+ artefatos$/);
    expect(section().textContent).toContain("hoje±0");
    const chip = within(row("pr:812")).getByRole("button", {
      name: "Voltar à afirmação 1 com pr:812 como fonte",
    });
    expect(chip.textContent).toBe("↑ afirmação 1");
    expect(section().textContent).toMatch(/citada pela afirmação \d/);
    expect(section().textContent).toMatch(/origem−\d+(,\d)?a/);
    expect(section().textContent).toMatch(/ · \d+a( \d+m)? de profundidade/);
    expect(section().textContent).not.toMatch(/\b(today|origin|deep|clause|quoted)\b/);
  });

  it("opens a row with its links in Portuguese", async () => {
    const user = userEvent.setup();
    setup(syntheticRetryCap);
    await user.click(row("pr:812").querySelector<HTMLButtonElement>("button[aria-expanded]")!);
    expect(within(row("pr:812")).getByRole("button", { name: "Investigar →" })).toBeTruthy();
    expect(within(row("pr:812")).getByRole("link", { name: /^Abrir .+ ↗$/ })).toBeTruthy();
  });

  it("says which clause it is tracing and leads back to it", async () => {
    const user = userEvent.setup();
    setup(syntheticRetryCap);
    await user.click(document.querySelector<HTMLButtonElement>('li[data-clause="c1"] > button')!);
    expect(section().textContent).toMatch(/seguindo a afirmação 2 · [A-Z](?: [A-Z])*/);
    expect(within(section()).getByRole("button", { name: "↑ Voltar à afirmação 2" })).toBeTruthy();
  });

  it("folds a long run of uncited changes and opens it on request", async () => {
    const user = userEvent.setup();
    const { container } = setup(states.syntheticManyOwners(8));
    const fold = screen.getByText("8 mudanças anteriores que a resposta não cita");
    const run = fold.closest("li")!;
    expect(run.textContent).toMatch(/8 commits · 8 PRs/);
    expect(run.querySelector("[aria-hidden]")!.textContent).toMatch(
      /^[a-z]{3} \d{4}( – [a-z]{3} \d{4})?$/,
    );
    expect((await axe(container)).violations).toEqual([]);
    await user.click(screen.getByRole("button", { name: "Mostrar as 8" }));
    expect(row("commit:b000001")).toBeTruthy();
  });

  it("lists the changes found by following the line back, with what each did", () => {
    setup(KEPT["ng-http-114"], { reading: true, kept: true });
    const earlier = screen.getByRole("list", {
      name: "Mudanças anteriores nesta linha, encontradas ao segui-la para trás",
    });
    const first = within(earlier).getAllByRole("listitem")[0];
    expect(first.textContent).toContain("adicionou esta linha");
    expect(within(first).getByText("a mensagem do commit").closest("details")!.open).toBe(false);
    expect(summary()).toMatch(/→ origem −\S+ · 2 mudanças · 1 artefato$/);
    expect(section().querySelector("[data-fact]")!.textContent).toMatch(
      /^reescreveu esta linha · antes: /,
    );
  });

  it("marks where the reading stopped instead of calling it the origin", () => {
    const base = KEPT["ng-http-114"];
    setup(
      { ...base, evidence: { ...base.evidence, lineage: undefined } },
      { reading: true, kept: true },
    );
    expect(summary()).toMatch(/^hoje ±0 → limite da leitura −\S+ · 1 mudança · 1 artefato$/);
  });

  it("keeps a silent change apart and names what was collected off the line's history", () => {
    setup(KEPT["ng-http-114"], { kept: true });
    expect(section().textContent).toContain("sem registro");
    setup(states.syntheticFileGranularity());
    expect(
      screen.getByRole("heading", { name: "Também coletados, fora do histórico da linha" }),
    ).toBeTruthy();
  });
});
