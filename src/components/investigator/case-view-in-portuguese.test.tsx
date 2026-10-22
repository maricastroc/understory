import type { DigResult } from "@understory/core/types";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import type { Locale } from "@/i18n/locales";
import { axe } from "@/test/axe";
import { syntheticRetryCap } from "../line-investigation/fixtures/synthetic-retry-cap";
import * as states from "../line-investigation/fixtures/synthetic-states";
import { CaseDetails } from "../rail/CaseDetails";
import { CaseView } from "./CaseView";
import type { Entry } from "./use-investigation";

function withoutLine(result: DigResult): DigResult {
  return { ...result, evidence: { ...result.evidence, location: undefined } };
}

function setup(result: DigResult, locale: Locale = "pt-BR", question = "Why exactly 3 retries?") {
  const entry = {
    caseId: "case-1",
    form: { repoPath: "/repo", question },
    result: withoutLine(result),
  } as unknown as Entry;
  return render(
    <LocaleProvider locale={locale}>
      <main>
        <CaseView entry={entry} onBack={() => {}} />
        <CaseDetails result={entry.result} />
      </main>
    </LocaleProvider>,
  );
}

const text = () => document.body.textContent!;

describe("the case view without a line, in Portuguese", () => {
  it("names its sections, counts and verdict in Portuguese", async () => {
    const { container } = setup(syntheticRetryCap);
    expect(screen.getByRole("button", { name: "Voltar ao código" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Why exactly 3 retries?");
    for (const heading of [
      "Resultado",
      "Cadeia de proveniência",
      "Evidências",
      "Linha do tempo da proveniência",
    ])
      expect(screen.getByRole("heading", { level: 2, name: heading })).toBeTruthy();
    expect(text()).toMatch(/Resolvido/);
    expect(text()).toMatch(/Confiança (alta|média|baixa) · \d+%/);
    expect(text()).toMatch(/\d+ artefatos · \d+ citados? · \d+ de apoio/);
    expect(text()).toContain("Artefato A");
    expect(text()).toContain("Repositório");
    expect(text()).toContain("Todas as citações têm respaldo");
    expect(text()).toMatch(/\d{1,2} (jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez) \d{4}/);
    expect(text()).not.toMatch(
      /Findings|Provenance|Exhibit|Supporting|Sources used|Back to code|Who's involved|confidence/,
    );
    expect((await axe(container)).violations).toEqual([]);
  });

  it("marks the writer's sentences with their language and keeps the labels out of it", () => {
    setup(states.syntheticUncited());
    const uncited = screen.getByText("sem citação");
    expect(uncited.closest("[lang]")).toBeNull();
    const sentence = screen.getByText("The team later regretted the limit.");
    expect(sentence.getAttribute("lang")).toBe("en");
    expect(text()).toContain("não cita nenhuma fonte coletada");
  });

  it("says a citation is unsupported the way the case screen does", () => {
    setup(states.syntheticFabricated());
    expect(text()).toContain("1 citação sem respaldo barrada pela verificação: commit:deadbee.");
    expect(text()).toContain("Fora das evidências coletadas.");
  });

  it("keeps what the auditor and core wrote as written, marked as English", () => {
    setup(states.syntheticMisattributed());
    expect(text()).toContain("2 fontes citadas não sustentam a afirmação");
    for (const reason of screen.getAllByText("the reviews do not mention five"))
      expect(reason.getAttribute("lang")).toBe("en");
    setup(states.syntheticContradicted());
    expect(text()).toContain("Uma fonte citada é contrariada pelo histórico posterior");
    expect(screen.getByText("Reverted by 0badc0d").getAttribute("lang")).toBe("en");
  });

  it("tells the file-level note in Portuguese and an error from the writer as written", () => {
    setup(states.syntheticFileGranularity());
    expect(text()).toContain("O blame do provedor não trouxe o histórico desta linha");
    setup(states.syntheticCommitsOnly());
    expect(screen.getByText("No language model is configured.").getAttribute("lang")).toBe("en");
    expect(text()).toContain("O histórico registrado desta linha são os próprios commits.");
  });

  it("shows the general question in Portuguese when none was asked, and an out-of-scope answer", () => {
    setup(syntheticRetryCap, "pt-BR", "");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Por que esta linha é assim?",
    );
    setup(states.syntheticOutOfScope());
    expect(text()).toContain("Pergunta fora do escopo da investigação");
  });
});

describe("the case view without a line, in English", () => {
  it("keeps its words and drops only the dashes", () => {
    setup(syntheticRetryCap, "en");
    expect(screen.getByRole("button", { name: "Back to code" })).toBeTruthy();
    expect(text()).toContain("Reconstructed conclusion, each claim linked to the sources it cites");
    expect(text()).toContain(
      "Issue → pull request → review → commit: the causal path to this line, and where it breaks",
    );
    expect(text()).toContain("Exhibit A");
    expect(text()).toMatch(/(High|Medium|Low) confidence · \d+%/);
    expect(text()).not.toMatch(/ — /);
    setup(states.syntheticFabricated(), "en");
    expect(text()).toContain(
      "1 fabricated citation caught by verification: commit:deadbee. Not in the collected evidence.",
    );
  });
});
