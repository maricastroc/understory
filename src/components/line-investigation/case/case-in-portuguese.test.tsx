import type { DigResult } from "@understory/core/types";
import { readAnswer } from "@understory/core/reading";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { axe } from "@/test/axe";
import { LINE_QUESTION } from "../../investigator/default-question";
import { sourceNamer, whyCopy } from "../copy/why-copy";
import controls from "../fixtures/control-cases.json";
import kept from "../fixtures/kept-cases.json";
import type { SpecimenSlot } from "../instrument/types";
import { buildInvestigationView } from "../model/build-investigation-view";
import { CodeSpecimen } from "../specimen/CodeSpecimen";
import { SPECIMEN_LAYOUTS } from "../specimen/use-specimen-layout";
import { whyModel } from "../why/why-model";
import { LineInvestigation } from "./LineInvestigation";

const CASES: Record<string, DigResult> = {
  ...(kept.cases as unknown as Record<string, DigResult>),
  ...Object.fromEntries(
    Object.entries(controls.cases as unknown as Record<string, DigResult>).map(([id, result]) => [
      `control-${id}`,
      result,
    ]),
  ),
};
const NOW = Date.parse("2026-10-12T12:00:00Z");

function setup(result: DigResult, reading?: boolean) {
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
    <LocaleProvider locale="pt-BR">
      <LineInvestigation
        result={result}
        pending={false}
        now={NOW}
        layout={SPECIMEN_LAYOUTS.wide}
        renderSpecimen={slot}
        onFollowUp={() => {}}
        onBackToQuestion={() => {}}
        {...(reading === undefined ? {} : { reading })}
      />
    </LocaleProvider>,
  );
}

const zone = () => screen.getByRole("region", { name: "O que o histórico sustenta" });

beforeEach(() => window.localStorage.clear());

describe("the case screen in Portuguese", () => {
  it("names the why, the verdict and its checks, and writes the confidence the Brazilian way", () => {
    setup(CASES["ng-http-114"]);
    expect(screen.getByRole("region", { name: "O porquê reconstruído" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "← Voltar à pergunta" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Continuar neste arquivo" })).toBeTruthy();
    const chip = screen.getByRole("button", { name: /^Resolvido/ });
    fireEvent.click(chip);
    const popover = screen.getByRole("dialog", { name: "Por que está resolvido" });
    expect(popover.textContent).toContain("Confiança calculada");
    expect(popover.textContent).toMatch(/\d,\d\d · (alta|média|baixa)/);
    expect(popover.textContent).toContain(
      "Calculada a partir das verificações acima, nunca pela autoavaliação do modelo.",
    );
  });

  it("shows the general question in Portuguese and keeps a question someone asked as it was", () => {
    const asked = CASES["ng-http-114"];
    setup({ ...asked, evidence: { ...asked.evidence, question: LINE_QUESTION } });
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Por que esta linha é assim?",
    );
  });

  it("keeps the three kinds of reason apart, with her vocabulary", () => {
    setup(CASES["ws-revert-story"], true);
    const labels = [...zone().querySelectorAll("[data-why-change] button")].map((b) =>
      b.textContent!.replace(/^.*?(Documentado para esta linha|Explicação provável)/, "$1"),
    );
    expect(labels).toEqual([
      "Documentado para esta linha · afirmação 3",
      "Explicação provável · afirmação 2",
      "Explicação provável · afirmação 1",
    ]);
    expect(zone().querySelector("[data-why-change]")!.textContent).toMatch(
      /^última mudança · 9da72fa · 18 mar 2024 · reescreveu esta linha/,
    );
    expect(zone().textContent).toContain(
      "título do commit “sync: drop zero-quantity rows only for discontinued SKUs”",
    );
    expect(screen.getByRole("button", { name: /^Respondido/ })).toBeTruthy();
  });

  it("marks only the writer's sentences with their language, never the labels around them", () => {
    setup(CASES["ws-revert-story"], true);
    const row = zone().querySelector("[data-why-change] button")!;
    const sentence = row.querySelector("[lang]")!;
    expect(sentence.getAttribute("lang")).toBe("en");
    const label = [...row.querySelectorAll("span")].find((s) =>
      s.textContent!.startsWith("Documentado para esta linha"),
    )!;
    expect(label.closest("[lang]")).toBeNull();
  });

  it("says when no reason is identified, and folds what is not established", () => {
    setup(CASES["tslint-257"], true);
    expect(zone().textContent).toContain(
      "Nenhuma justificativa para esta linha foi identificada no histórico.",
    );
    expect(zone().textContent).toContain("Do registro desta mudança · afirmação 3");
    expect(zone().textContent).toContain("review·ajafff · comentário feito em outro arquivo");
    expect(zone().querySelector("details summary")!.textContent).toBe("Não estabelecido · 3");
  });

  it("opens a likely explanation's source with the note that its link is an interpretation", () => {
    setup(CASES["control-tslint-189"], true);
    fireEvent.click(within(zone()).getAllByRole("button", { name: /Explicação provável/ })[0]);
    const evidence = screen.getByRole("region", { name: /^EVIDÊNCIA · AFIRMAÇÃO 1/ });
    expect(evidence.querySelector("[data-likely-note]")!.textContent).toBe(
      "O texto citado documenta a mudança a que pertence. A ligação dele com esta linha é uma interpretação do Understory.",
    );
    expect(within(evidence).getByRole("button", { name: "Ver no histórico ↓" })).toBeTruthy();
    expect(within(evidence).getByRole("link", { name: "Abrir no GitHub ↗" })).toBeTruthy();
    expect(within(evidence).getByRole("button", { name: "Fechar evidência" })).toBeTruthy();
  });

  it("copies the why with labels in Portuguese and the sentences as they were written", () => {
    const result = CASES["ws-revert-story"];
    const view = buildInvestigationView(result, { now: NOW, reading: true });
    const model = whyModel(readAnswer(result.evidence, result.narrative)!);
    const copied = whyCopy(model, sourceNamer(view.artifacts), "pt-BR")!;
    expect(copied).toMatch(/^Documentado para esta linha:\n- /);
    expect(copied).toContain("\n\nExplicações prováveis:\n- ");
    expect(copied).toContain("9da72fa, a última mudança, 18 mar 2024");
    for (const claim of result.narrative!.claims.slice(0, 1))
      expect(copied).toContain(claim.text.slice(0, 20));
    expect(copied).not.toMatch(/Documented|Likely|the last change/);
  });

  it("has no axe violations, with the reading and without it", async () => {
    for (const reading of [false, true]) {
      const { container, unmount } = setup(CASES["control-tslint-189"], reading);
      expect((await axe(container)).violations).toEqual([]);
      unmount();
    }
  });
});
