import type { FileHistory } from "@understory/core/types";
import { describe, expect, it } from "vitest";
import { syntheticOverview } from "../fixtures/synthetic-overview";
import { lastChange } from "../line-context-copy";
import { stageCopy } from "../stage-copy";
import { coreLabel, statusFacts } from "./core-copy";
import { coreHistory, depthScale } from "./depth";
import { headLabel } from "./head-label";
import { mappedLine, scopeAbout, scopeWhy, whyShown } from "./scope-copy";
import { historyFacts, historyShares, prAbsence, shareLine } from "./share-copy";

const head = { sha: "h".repeat(40), date: "2026-09-25T00:00:00Z" };

const history = (marks: Array<[string, number, "found" | "none" | "failed" | "skipped"]>) =>
  ({
    path: "a.ts",
    blobSha: "b",
    status: "mapped",
    lineCount: marks.reduce((a, [, l]) => a + l, 0),
    marks: marks.map(([at, lines, prLookup], i) => ({
      sha: `c${i}`,
      at,
      lines,
      prLookup,
      boundary: false,
    })),
    cut: false,
  }) as FileHistory;

const a = history([
  ["2025-01-01T00:00:00Z", 6, "found"],
  ["2021-01-01T00:00:00Z", 2, "none"],
  ["2020-01-01T00:00:00Z", 2, "failed"],
]);

describe("the map's copy in Portuguese", () => {
  it("says why files are shown, with agreement and the thousands written the Brazilian way", () => {
    expect(scopeWhy(syntheticOverview, false, "pt-BR")).toBe(
      "12 alterados nos últimos 12 commits · 2 com seus casos",
    );
    expect(
      scopeWhy(
        { ...syntheticOverview, files: syntheticOverview.files.slice(2, 4) },
        false,
        "pt-BR",
      ),
    ).toBe("Alterados nos últimos 12 commits");
    expect(scopeAbout(syntheticOverview, "pt-BR")).toBe(
      "14 de 1.284 arquivos no HEAD, escolhidos pelos motivos acima. Não é uma amostra do repositório inteiro.",
    );
    expect(whyShown("recent", 1, "pt-BR")).toBe("Aparece porque mudou no último commit.");
    expect(whyShown("path", 12, "pt-BR")).toBe(
      "Aparece porque o caminho parece de um arquivo-fonte principal.",
    );
    expect(mappedLine(3, 14, 5, "pt-BR")).toBe("3 de 14 mapeados · mapeando 5");
  });

  it("counts lines with a PR and says when the lookups are missing", () => {
    expect(shareLine([a], "github", "pt-BR")).toBe(
      "60% das linhas em 1 arquivo mapeado têm PR · 20% não verificadas",
    );
    expect(prAbsence([history([["2020-01-01T00:00:00Z", 3, "skipped"]])], "github", "pt-BR")).toBe(
      "A consulta de PRs não estava disponível para o único arquivo mapeado.",
    );
    expect(prAbsence([a], "none", "pt-BR")).toMatch(/^Os dados de PR não estão disponíveis/);
  });

  it("states a file's history with ages, plurals and a cut history", () => {
    const view = coreHistory(a, head, depthScale([a], head));
    expect(historyFacts(view, "pt-BR")).toBe(
      "Linha mais antiga ainda presente: 6a 8m. As 10 linhas do HEAD vêm de 3 commits.",
    );
    expect(historyFacts({ ...view, commits: 1, lines: 1 }, "pt-BR")).toBe(
      "Linha mais antiga ainda presente: 6a 8m. A linha do HEAD vem de 1 commit.",
    );
    expect(historyFacts({ ...view, cut: true }, "pt-BR")).toBe(
      "Linha mais antiga ainda presente: ≥ 6a 8m. As 10 linhas do HEAD vêm de 3 commits. Histórico cortado na profundidade do clone.",
    );
    expect(historyShares(view, "pt-BR")).toBe(
      "60% com PR · 20% sem PR · 20% não verificadas (das linhas)",
    );
  });

  it("names each file on the map for a screen reader", () => {
    const core = syntheticOverview.files[0];
    const mapCore = { ...core, dir: "src/billing/", name: "charge.ts", cases: 3 } as never;
    const view = coreHistory(a, head, depthScale([a], head));
    expect(coreLabel(mapCore, "mapped", view, "pt-BR")).toBe(
      "src/billing/charge.ts, linha mais antiga ainda presente com 6 anos e 8 meses, 3 casos",
    );
    expect(coreLabel(mapCore, "stub", null, "pt-BR")).toBe(
      "src/billing/charge.ts, histórico ainda não mapeado, 3 casos",
    );
    expect(statusFacts("too-large", "pt-BR")).toBe(
      "Grande demais para mapear. Ainda dá para abrir e investigar.",
    );
  });

  it("dates the HEAD and the last change of a line in Portuguese", () => {
    expect(headLabel(syntheticOverview.head!, "pt-BR")).toEqual({
      sha: "4e1d0a2",
      day: "25 set",
      year: "2026",
    });
    const change = lastChange(
      [
        { sha: "a".repeat(40), shortSha: "aaaaaaa", date: "2024-03-09T10:00:00Z", author: "Ana" },
      ] as never,
      head,
      "pt-BR",
    );
    expect(change).toMatchObject({ date: "9 mar 2024", age: "2a 6m" });
  });

  it("titles each stage of the composer", () => {
    const base = { connecting: false, fileLoading: false, about: null };
    expect(stageCopy({ ...base, stage: "repo" }, "pt-BR").title).toBe("Abra um repositório");
    expect(stageCopy({ ...base, stage: "code" }, "pt-BR").title).toBe(
      "Escolha uma linha ou um trecho",
    );
    expect(stageCopy({ ...base, stage: "code", about: "esta função" }, "pt-BR")).toEqual({
      title: "Pergunte sobre esta função",
      lead: "A resposta percorre o histórico por commits, pull requests e issues, e cita cada fonte. Quando o histórico não traz o motivo, ela foi feita para dizer isso.",
    });
  });
});
