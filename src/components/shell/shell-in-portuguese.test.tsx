import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { messagesFor } from "@/i18n/messages";
import { axe } from "@/test/axe";
import { CaseFailure } from "../investigator/CaseFailure";
import { LoadingCard } from "../investigator/LoadingCard";
import { syntheticCases } from "../line-investigation/fixtures/synthetic-cases";
import { syntheticFabricated } from "../line-investigation/fixtures/synthetic-states";
import { SYNTHETIC_NOW } from "../line-investigation/fixtures/synthetic-retry-cap";
import { AppHeader } from "./AppHeader";
import { CaseRail } from "./CaseRail";
import { CaseStrip } from "./CaseStrip";
import { RailDrawer } from "./RailDrawer";
import { railFooterInfo } from "./rail-footer-info";
import { lineRailItems } from "./rail-items";

vi.mock("../investigator/use-auth", () => ({ authEnabled: true }));
vi.mock("@/i18n/set-locale", () => ({ setLocale: vi.fn() }));

const pt = messagesFor("pt-BR");
const now = Date.parse(SYNTHETIC_NOW);
const items = lineRailItems(syntheticCases, { activeId: "GI-2049", now, m: pt });

const inPortuguese = (node: React.ReactNode) =>
  render(<LocaleProvider locale="pt-BR">{node}</LocaleProvider>);

const header = (user: Parameters<typeof AppHeader>[0]["user"]) => (
  <AppHeader
    repo={{ name: "acme/payments-service", detail: "main", url: "https://x", connected: true }}
    onNewInRepo={() => {}}
    cases={items}
    onSelectCase={() => {}}
    fileSearch={{ repoPath: "acme/payments-service" }}
    onNewInvestigation={() => {}}
    user={user}
    onMenuClick={() => {}}
  />
);

describe("the shell in Portuguese", () => {
  it("titles and describes each case, keeping what came from git as it was", () => {
    expect(items.map((i) => [i.title, i.subline])).toEqual([
      ["Why exactly 3 retries?", "charge.ts:9 · 5 de 6 elos"],
      ["Which alternatives did review reject?", "a partir de B · review·dmitri-k"],
      ["Why is the idempotency key req.id?", "charge.ts:11 · 2 de 4 elos"],
      ["Why are 4xx errors never retried?", "charge.ts:13 · sem registro"],
      ["Why does refund skip the ledger?", "refund.ts:42 · só evidências"],
    ]);
  });

  it("titles a case asked with the general question by its lines, and counts links with plurals", () => {
    const base = syntheticCases[0];
    const at = (startLine: number, endLine: number) => ({
      ...base,
      form: { ...base.form, question: "Why is this line the way it is?" },
      result: {
        ...base.result,
        evidence: {
          ...base.result.evidence,
          question: "Why is this line the way it is?",
          location: { file: "src/billing/charge.ts", startLine, endLine },
        },
      },
    });
    const [single, range] = lineRailItems([at(9, 9), { ...at(8, 12), caseId: "GI-9" }], {
      activeId: null,
      now,
      m: pt,
    });
    expect(single.title).toBe("Linha 9 de charge.ts");
    expect(range.title).toBe("Linhas 8–12 de charge.ts");
    expect(pt.shell.linksOf(1, 1)).toBe("1 de 1 elo");
    expect(pt.shell.links(1)).toBe("1 elo");
    expect(pt.shell.links(3)).toBe("3 elos");
    expect(messagesFor("en").shell.links(1)).toBe("1 link");
  });

  it("says a case whose answer cites a source that was not collected has a citation without backing", () => {
    const [item] = lineRailItems([{ ...syntheticCases[0], result: syntheticFabricated() }], {
      activeId: null,
      now,
      m: pt,
    });
    expect(item.status).toBe("fabrication");
    expect(item.subline).toBe("charge.ts:9 · citação sem respaldo");
  });

  it("says in the footer whether cases are kept", () => {
    expect(railFooterInfo(null, false, pt)).toMatchObject({
      name: "Visitante",
      subline: "Entre para salvar seus casos",
    });
    const user = { login: "m", name: "Mariana", avatarUrl: "" };
    expect(railFooterInfo(user, true, pt).subline).toBe("Casos salvos na sua conta");
    expect(railFooterInfo(user, false, pt).subline).toBe("Este servidor não salva os casos");
  });

  it("names the rail, its rows and its actions", async () => {
    const { container } = inPortuguese(
      <CaseRail
        items={items}
        onSelect={() => {}}
        onRemove={() => {}}
        footer={railFooterInfo(null, false, pt)}
        onNew={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getByRole("heading", { name: "Investigações" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Nova investigação" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Fechar investigações" })).toBeTruthy();
    const list = screen.getByRole("navigation", { name: "Lista de casos" });
    expect(within(list).getByRole("button", { current: "page" }).textContent).toContain(
      "resolvido · charge.ts:9 · 5 de 6 elos",
    );
    expect(
      within(list).getByRole("button", { name: "Remover “Why exactly 3 retries?”" }),
    ).toBeTruthy();
    expect((await axe(container)).violations).toEqual([]);
  });

  it("says the rail is empty in Portuguese", () => {
    inPortuguese(
      <CaseRail items={[]} onSelect={() => {}} footer={railFooterInfo(null, false, pt)} />,
    );
    expect(screen.getByText("Nenhuma investigação ainda.")).toBeTruthy();
    expect(
      screen.getByText("Cada linha que você investigar fica aqui, com a trilha que ela seguiu."),
    ).toBeTruthy();
  });

  it("names the strip and the drawer", () => {
    inPortuguese(
      <>
        <CaseStrip items={items} expanded={false} onOpen={() => {}} />
        <RailDrawer open onClose={() => {}}>
          <p>x</p>
        </RailDrawer>
      </>,
    );
    expect(
      screen.getByRole("button", {
        name: "Mostrar investigações, 5. Aberta: Why exactly 3 retries?",
      }),
    ).toBeTruthy();
    expect(screen.getByRole("dialog", { name: "Investigações" })).toBeTruthy();
  });

  it("translates the header, its search, the repository menu and the account", async () => {
    const { container, rerender } = inPortuguese(header(null));
    expect(screen.getByRole("button", { name: "Abrir investigações" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Nova investigação" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Entrar" })).toBeTruthy();
    const search = screen.getByRole("combobox");
    expect(search.getAttribute("placeholder")).toBe("Buscar arquivos, símbolos ou casos");
    fireEvent.change(search, { target: { value: "retries" } });
    expect(screen.getByRole("listbox", { name: "Resultados da busca" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Casos" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^acme\/payments-service/ }));
    const menu = screen.getByRole("dialog", { name: "Repositório" });
    expect(within(menu).getByRole("button", { name: "Nova investigação aqui" })).toBeTruthy();
    expect(within(menu).getByRole("link", { name: "Abrir repositório ↗" })).toBeTruthy();
    expect((await axe(container)).violations).toEqual([]);

    rerender(
      <LocaleProvider locale="pt-BR">
        {header({ login: "m", name: "Mariana Castro", avatarUrl: "" })}
      </LocaleProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Conta: Mariana Castro" }));
    expect(screen.getByRole("menuitem", { name: "Sair" })).toBeTruthy();
  });

  it("translates the loading card and a failed case", () => {
    inPortuguese(
      <>
        <LoadingCard />
        <CaseFailure
          failure={{ code: "failed", detail: "Bad location" }}
          signedIn
          onRetry={() => {}}
          onBack={() => {}}
        />
      </>,
    );
    expect(screen.getByRole("status").textContent).toBe(
      "Investigando…Coletando do git→Montando a linha do tempo→Reconstruindo o porquê→Verificando as citações",
    );
    expect(screen.getByText("Não foi possível concluir a investigação.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Voltar ao código" })).toBeTruthy();
  });
});
