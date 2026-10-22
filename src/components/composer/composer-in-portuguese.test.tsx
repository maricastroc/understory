import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { InvestigateInput } from "@understory/core/types";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { axe } from "@/test/axe";
import { Composer } from "./Composer";
import { syntheticHistory } from "./fixtures/synthetic-histories";
import {
  syntheticCaseCounts,
  syntheticMeta,
  syntheticOverview,
} from "./fixtures/synthetic-overview";
import type { Repo } from "./use-repo";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const CHARGE = [
  "import { gateway } from './gateway';",
  "",
  "export function chargeCustomer(id: string) {",
  "  const retries = 3;",
  "  return gateway.charge(id, { retries });",
  "}",
  "",
].join("\n");

const repo = (overrides: Partial<Repo> = {}): Repo => ({
  connecting: false,
  ready: true,
  meta: syntheticMeta,
  error: null,
  open: vi.fn(async () => {}),
  reset: vi.fn(),
  ...overrides,
});

function mockFetch(file: Response | null = null) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith("/api/overview")) return Response.json(syntheticOverview);
      if (url.startsWith("/api/history-map")) {
        const body = JSON.parse(String(init?.body));
        if (body.mode === "cached") return Response.json({ files: [] });
        return Response.json({
          files: body.files.map((f: { path: string }) => syntheticHistory(f.path)),
        });
      }
      if (url.startsWith("/api/file"))
        return file ?? Response.json({ path: "src/billing/charge.ts", content: CHARGE });
      return Response.json({ files: [] });
    }),
  );
}

function setup(onInvestigate: (input: InvestigateInput) => void = () => {}, r = repo()) {
  return render(
    <LocaleProvider locale="pt-BR">
      <Composer
        repo={r}
        repoPath="acme/payments-service"
        setRepoPath={() => {}}
        token=""
        setToken={() => {}}
        onInvestigate={onInvestigate}
        cases={{
          ordered: ["src/billing/charge.ts", "src/billing/refund.ts"],
          counts: syntheticCaseCounts,
        }}
        demoRepo=".demo/payments-service"
      />
    </LocaleProvider>,
  );
}

const trail = () => within(screen.getByRole("navigation", { name: "Etapas da investigação" }));
const line = (n: number) => screen.getByRole("button", { name: new RegExp(`^Linha ${n}[,.]`) });

async function openCharge(onInvestigate = vi.fn()) {
  mockFetch();
  const view = setup(onInvestigate);
  await screen.findByRole("heading", { name: "Histórico das linhas atuais" });
  fireEvent.click(screen.getByRole("button", { name: /^src\/billing\/charge\.ts,/ }));
  await screen.findByRole("button", { name: /^Linha 4\./ });
  return { onInvestigate, ...view };
}

afterEach(() => vi.unstubAllGlobals());

describe("the composer in Portuguese", () => {
  it("names the stages, the trail and the map", async () => {
    mockFetch();
    const { container } = setup();
    expect(screen.getByRole("heading", { level: 2, name: "Encontre o arquivo" })).toBeTruthy();
    expect(screen.getByText("Busque pelo nome ou escolha um no mapa abaixo.")).toBeTruthy();
    expect(trail().getByText("04 pergunta, ainda não")).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Encontrar um arquivo ou símbolo" })).toBeTruthy();
    await screen.findByRole("heading", { name: "Histórico das linhas atuais" });
    expect(screen.getByRole("button", { name: "Sobre este mapa" })).toBeTruthy();
    expect(screen.getByRole("list", { name: "Arquivos mostrados" })).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: /^src\/billing\/charge\.ts, (histórico ainda não mapeado|linha mais antiga ainda presente com .+), 3 casos$/,
      }),
    ).toBeTruthy();
    expect((await axe(container)).violations).toEqual([]);
  });

  it("asks about a line with its article, and keeps the general question it sends in English", async () => {
    const { onInvestigate } = await openCharge();
    expect(screen.getByRole("heading", { name: "Escolha uma linha ou um trecho" })).toBeTruthy();
    fireEvent.click(line(4));
    expect(screen.getByRole("heading", { name: "Pergunte sobre a linha 4" })).toBeTruthy();
    expect(
      trail().getByRole("button", { name: /^03 linha: linha 4, voltar a esta etapa$/ }),
    ).toBeTruthy();
    expect(screen.getByRole("group", { name: "Responder em" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Fazer uma pergunta específica/ }));
    expect(screen.getByRole("textbox", { name: "Sua pergunta sobre a linha 4" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Por que este valor?" }));
    fireEvent.click(screen.getByRole("button", { name: "Investigar a linha 4 →" }));
    expect(onInvestigate).toHaveBeenLastCalledWith(
      expect.objectContaining({ question: "Por que este valor?" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Usar a pergunta geral" }));
    fireEvent.click(screen.getByRole("button", { name: "Investigar a linha 4 →" }));
    expect(onInvestigate).toHaveBeenLastCalledWith(
      expect.objectContaining({ question: "Why is this line the way it is?" }),
    );
  });

  it("names a range and a whole function with the right gender", async () => {
    await openCharge();
    fireEvent.click(line(2));
    fireEvent.click(line(5), { shiftKey: true });
    expect(screen.getByRole("heading", { name: "Pergunte sobre as linhas 2–5" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Investigar as linhas 2–5 →" })).toBeTruthy();
    fireEvent.click(line(4));
    fireEvent.click(
      screen.getByRole("button", { name: "Investigar toda a função chargeCustomer 4 linhas" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Investigar chargeCustomer →" })).toBeTruthy(),
    );
    expect(screen.getByText("função")).toBeTruthy();
  });

  it("describes the file and its lines in the context panel", async () => {
    await openCharge();
    const context = screen.getByRole("complementary", { name: "Contexto" });
    expect(within(context).getByText("6 linhas no HEAD")).toBeTruthy();
    fireEvent.click(line(4));
    expect(within(context).getByRole("region", { name: "linha 4" })).toBeTruthy();
    expect(
      within(context).getByText(
        "Ainda falta investigar o pull request, as revisões e as issues por trás dela.",
      ),
    ).toBeTruthy();
  });

  it("says a file could not be opened in Portuguese, with the server's words below", async () => {
    mockFetch(Response.json({ error: "path not found" }, { status: 404 }));
    setup();
    await screen.findByRole("heading", { name: "Histórico das linhas atuais" });
    fireEvent.click(screen.getByRole("button", { name: /^src\/billing\/charge\.ts,/ }));
    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("Não foi possível abrir o arquivo.")).toBeTruthy();
    expect(within(alert).getByText("path not found").getAttribute("lang")).toBe("en");
  });

  it("offers access to a repository it cannot see", async () => {
    mockFetch();
    setup(
      () => {},
      repo({
        ready: false,
        meta: null,
        error: { code: "not-found", detail: "GitHub API 404", host: "GitHub" },
      }),
    );
    expect(screen.getByRole("heading", { level: 2, name: "Abra um repositório" })).toBeTruthy();
    expect(screen.getByText("Este repositório não fica visível sem acesso.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "use um token de acesso pessoal" }));
    expect(
      screen.getByLabelText("Token de acesso pessoal do GitHub").getAttribute("placeholder"),
    ).toBe("ghp_…, guardado só nesta aba");
  });
});
