import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { axe } from "@/test/axe";
import { HeroDemo } from "./demo/HeroDemo";
import { landingRejected, landingView, landingViewFor } from "./demo/landing-fixture";
import { EvidenceStandard } from "./EvidenceStandard";
import { Method } from "./Method";

const inPortuguese = (ui: React.ReactNode) =>
  render(<LocaleProvider locale="pt-BR">{ui}</LocaleProvider>);

const demo = () =>
  screen.getByRole("region", {
    name: "Exemplo de investigação de src/billing/charge.ts, linha 9",
  });

describe("the landing demo in Portuguese", () => {
  it("is the same case, with the explanation in Portuguese", () => {
    const pt = landingViewFor("pt-BR");
    expect(pt.verdict).toBe(landingView.verdict);
    expect(pt.clauses.map((c) => [c.id, c.letters, c.citations])).toEqual(
      landingView.clauses.map((c) => [c.id, c.letters, c.citations]),
    );
    expect(pt.artifacts).toEqual(landingView.artifacts);
    expect(pt.gaps).toEqual(landingView.gaps);
    expect(pt.question).toBe("Por que 3 tentativas?");
    expect(pt.clauses.map((c) => c.text)).toEqual([
      "Limitado a 3, com backoff",
      "Depois de 212 clientes cobrados em dobro",
      "Na revisão, 5 virou 3 por um timeout de 10\u00a0s",
    ]);
    expect(landingRejected).toEqual(["pr:9999"]);
  });

  it("asks in Portuguese and marks the same token in the code", () => {
    inPortuguese(<HeroDemo />);
    const question = within(demo()).getAllByRole("heading", { level: 2 })[0];
    expect(question.textContent).toBe("Por que 3 tentativas?");
    expect(question.querySelector(".text-strata-bore")!.textContent).toBe("3");
    expect(demo().textContent).toContain("pergunta sobre o token 3 · linha 9");
    expect(demo().textContent).toContain("6 artefatos · 3 afirmações · 1 silêncio");
  });

  it("keeps commits, quotes and file names as they were recorded", () => {
    inPortuguese(<HeroDemo />);
    const text = demo().textContent!;
    for (const kept of [
      "src/billing/charge.ts",
      "Cap charge retries at 3, add backoff",
      "Customers double-billed during Stripe outage",
      "“212 customers were charged twice”",
      "Add retry loop to charge",
    ])
      expect(text).toContain(kept);
    expect(text).toContain("primeira versão");
    expect(text).toContain("sem limite");
    expect(text).toContain("commit · escreveu a linha 9 como está hoje");
  });

  it("says the origin and the silence in Portuguese", () => {
    inPortuguese(<HeroDemo />);
    const text = demo().textContent!;
    expect(text).toContain("A origem da linha não deixou registro");
    expect(text).toContain("origem · linha 9 escrita pela primeira vez há 5,3 anos");
    expect(text).toContain("profundidade = tempo · a sondagem segue o token para baixo");
    const history = within(demo()).getAllByRole("list", {
      name: "Histórico, do mais recente para o mais antigo",
    })[0];
    expect(history.textContent).toContain(
      "Sem registro: nenhum pull request, revisão ou issue antes do commit 7be210e",
    );
  });

  it("opens on the second clause and names each clause's sources", () => {
    inPortuguese(<HeroDemo />);
    for (const b of within(demo()).getAllByRole("button", { name: /212 clientes/ }))
      expect(b.getAttribute("aria-pressed")).toBe("true");
    expect(demo().textContent).toMatch(
      /\d fontes? · \d citaç(ão literal verificada|ões literais verificadas)/,
    );
    expect(demo().textContent).not.toMatch(
      /asked of|artifacts|clauses|record silent|verified trace|first revision|no bound|quoted verbatim|\btoday\b/,
    );
  });

  it.each([
    ["wide", ".min-\\[1200px\\]\\:hidden"],
    ["stacked", ".max-\\[1200px\\]\\:hidden"],
  ])("passes axe in its %s form", async (_, hiddenByCss) => {
    const { container } = inPortuguese(<HeroDemo />);
    container.querySelector<HTMLElement>(hiddenByCss)!.style.display = "none";
    expect((await axe(container)).violations).toEqual([]);
  });
});

describe("the landing sections in Portuguese", () => {
  it("states the evidence standard with the real checks", async () => {
    const { container } = inPortuguese(<EvidenceStandard />);
    expect(
      screen.getByRole("heading", {
        name: "Não é um chat sobre o seu repositório. É um registro que você pode auditar.",
      }),
    ).toBeTruthy();
    const text = container.textContent!;
    expect(text).toContain("Depois de 212 clientes cobrados em dobro");
    expect(text).toContain("✓ Citação literal encontrada em issue:1187");
    expect(text).toContain("pr:9999 · fora das evidências, rejeitada");
    expect(text).toContain("7be210e · commit direto");
    expect(text).toContain("∅ nenhum pull request, revisão ou issue");
    expect(text).toContain("motivo: sem registro");
    expect((await axe(container)).violations).toEqual([]);
  });

  it("walks through the method in Portuguese", async () => {
    const { container } = inPortuguese(<Method />);
    expect(
      screen.getByRole("heading", {
        name: "De uma linha que você não entende à decisão por trás dela.",
      }),
    ).toBeTruthy();
    expect(screen.getByRole("list", { name: "src/billing/charge.ts, linhas 8–10" })).toBeTruthy();
    const text = container.textContent!;
    expect(text).toContain("Limitado a 3, com backoff");
    expect(text).toContain("Por que tentar de novo: sem registro");
    expect(text).toContain("pull request · revisão");
    expect((await axe(container)).violations).toEqual([]);
  });
});
