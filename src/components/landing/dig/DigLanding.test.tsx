import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { axe } from "@/test/axe";
import { landingRejected, landingViewFor } from "../demo/landing-fixture";
import { DigLanding } from "./DigLanding";

beforeAll(() => {
  if (!window.matchMedia)
    Object.defineProperty(window, "matchMedia", {
      value: (query: string) => ({
        matches: false,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
    });
});

const inPortuguese = () =>
  render(
    <LocaleProvider locale="pt-BR">
      <DigLanding />
    </LocaleProvider>,
  );

describe("the dig in Portuguese", () => {
  it("is the same case, with the explanation in Portuguese", () => {
    const en = landingViewFor("en");
    const pt = landingViewFor("pt-BR");
    expect(pt.verdict).toBe(en.verdict);
    expect(pt.clauses.map((c) => [c.id, c.letters, c.citations])).toEqual(
      en.clauses.map((c) => [c.id, c.letters, c.citations]),
    );
    expect(pt.artifacts).toEqual(en.artifacts);
    expect(pt.gaps).toEqual(en.gaps);
    expect(pt.question).toBe("Por que 3 tentativas?");
    expect(pt.clauses.map((c) => c.text)).toEqual([
      "Limitado a 3, com backoff",
      "Depois de 212 clientes cobrados em dobro",
      "Na revisão, 5 virou 3 por um timeout de 10 s",
    ]);
    expect(landingRejected).toEqual(["pr:9999"]);
  });

  it("asks in Portuguese and marks the token the probe goes down from", () => {
    const { container } = inPortuguese();
    expect(container.textContent).toContain("pergunta sobre o token 3 · linha 9");
    const asked = [...container.querySelectorAll(".text-li-brand")].map((el) => el.textContent);
    expect(asked).toEqual(["3"]);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Por que esta linha está aqui?",
    );
  });

  it("keeps commits, quotes and file names as they were recorded, marked as English", () => {
    const { container } = inPortuguese();
    for (const kept of [
      "git blame -L 9,9 src/billing/charge.ts",
      "Cap charge retries at 3, add backoff",
      "Customers double-billed during Stripe outage",
      "212 customers were charged twice",
      "Add retry loop to charge",
    ]) {
      const holder = [...container.querySelectorAll("p, span, li")].find((el) =>
        el.textContent?.includes(kept),
      );
      expect(holder, kept).toBeTruthy();
    }
    const quote = [...container.querySelectorAll("[lang]")].filter((el) =>
      el.textContent?.includes("212 customers were charged twice"),
    );
    expect(quote.length).toBeGreaterThan(0);
    expect(quote.every((el) => el.getAttribute("lang") === "en")).toBe(true);
  });

  it("tells the trail, the silence and the reading in Portuguese", () => {
    const { container } = inPortuguese();
    const text = container.textContent!;
    for (const said of [
      "O blame para aqui.",
      "Treze dias em março de 2023.",
      "Aqui o registro se cala.",
      "procurado, e o provedor não tem",
      "primeira versão",
      "sem limite",
      "origem · linha 9 escrita pela primeira vez há 5,3 anos",
      "Três motivos no registro. Uma pergunta em aberto.",
      "fica em aberto na resposta, sem palpite",
    ])
      expect(text, said).toContain(said);
    expect(text).not.toMatch(
      /scroll to dig|reconstructed why|first revision|no bound|not in blame|looked for|Line read|left open|depth unknown|Blame stops/,
    );
  });

  it("passes axe", async () => {
    const { container } = inPortuguese();
    expect((await axe(container)).violations).toEqual([]);
  });
});
