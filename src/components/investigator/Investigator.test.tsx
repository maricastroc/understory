import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import type { Locale } from "@/i18n/locales";
import { syntheticChargeLines } from "../line-investigation/fixtures/synthetic-charge-file";
import { syntheticRetryCap } from "../line-investigation/fixtures/synthetic-retry-cap";
import { Investigator } from "./Investigator";

const params = vi.hoisted(
  () => new URLSearchParams("repo=synthetic/payments-service&file=src/billing/charge.ts&line=9"),
);

vi.mock("next/navigation", () => ({ useSearchParams: () => params }));

type Call = { path: string; body?: { language?: "en" | "pt" } };

function stubApi() {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  const dig = new ReadableStream<Uint8Array>({ start: (c) => void (controller = c) });
  const calls: Call[] = [];
  let answer: (narrative: object) => void = () => {};
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      const path = new URL(input, "http://localhost").pathname;
      calls.push({
        path,
        body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
      });
      if (path === "/api/dig") {
        return new Response(dig, { headers: { "content-type": "application/x-ndjson" } });
      }
      if (path === "/api/file") {
        return Response.json({ content: `${syntheticChargeLines.join("\n")}\n` });
      }
      if (path === "/api/blame") return Response.json({ spans: [] });
      if (path === "/api/investigations") {
        return Response.json({ investigations: [], persisted: false });
      }
      if (path === "/api/narrate") {
        return new Promise<Response>((resolve) => {
          answer = (narrative) => resolve(Response.json({ narrative }));
        });
      }
      return Response.json({ error: "not stubbed" }, { status: 404 });
    }),
  );
  const push = (line: object) => controller!.enqueue(encoder.encode(`${JSON.stringify(line)}\n`));
  return {
    calls,
    digLanguage: () => calls.find((c) => c.path === "/api/dig")!.body!.language!,
    evidence: () => push({ phase: "evidence", evidence: syntheticRetryCap.evidence }),
    final: (language: string) => {
      push({ phase: "final", narrative: { ...syntheticRetryCap.narrative, language } });
      controller!.close();
    },
    narrate: (language: string) => answer({ ...syntheticRetryCap.narrative, language }),
  };
}

const why = () => screen.getByRole("region", { name: "Reconstructed why" });
const code = (container: HTMLElement) => container.querySelector("section[data-datum-y]");
const clauses = (region: HTMLElement) => region.querySelectorAll("li[data-clause]");

afterEach(() => vi.unstubAllGlobals());

describe("Investigator — a deep-linked line case", () => {
  it("keeps one case on screen from collecting to the answer", async () => {
    const api = stubApi();
    const { container } = render(<Investigator />);
    await screen.findByText("Collecting the line's history…");
    const region = why();
    expect(within(region).queryByRole("group", { name: "Analysis" })).toBeNull();
    await waitFor(() => expect(code(container)).not.toBeNull());
    const panel = code(container);

    await act(async () => api.evidence());
    await within(region).findByText(/^Reconstructing from 6 artifacts/);
    expect(why()).toBe(region);
    expect(code(container)).toBe(panel);
    expect(screen.queryByText("Loading file…")).toBeNull();

    await act(async () => api.final(api.digLanguage()));
    await waitFor(() => expect(clauses(region).length).toBeGreaterThan(0));
    expect(why()).toBe(region);
    expect(code(container)).toBe(panel);
    expect(api.calls.filter((c) => c.path === "/api/narrate")).toHaveLength(0);
  });

  it("keeps the clauses on screen while the analysis is rewritten in the other language", async () => {
    const api = stubApi();
    render(<Investigator />);
    await screen.findByText("Collecting the line's history…");
    const written = api.digLanguage();
    await act(async () => {
      api.evidence();
      api.final(written);
    });
    const region = why();
    await waitFor(() => expect(clauses(region).length).toBeGreaterThan(0));
    const count = clauses(region).length;

    const other = written === "en" ? "pt" : "en";
    expect(within(screen.getByRole("banner")).queryByRole("group")).toBeNull();
    const analysis = within(region).getByRole("group", { name: "Analysis" });
    fireEvent.click(within(analysis).getByRole("button", { name: other.toUpperCase() }));
    await within(region).findByText(`rewriting in ${other === "pt" ? "Portuguese" : "English"}…`);
    expect(clauses(region)).toHaveLength(count);
    expect(within(region).queryByRole("status")).toBeNull();

    await act(async () => api.narrate(other));
    await within(region).findByText("select a clause to check its evidence");
    expect(clauses(region)).toHaveLength(count);
    expect(why()).toBe(region);
  });
});

const inLocale = (locale: Locale) => (
  <LocaleProvider locale={locale}>
    <Investigator />
  </LocaleProvider>
);

const requests = (api: ReturnType<typeof stubApi>, path: string) =>
  api.calls.filter((c) => c.path === path);

describe("Investigator — the interface language and the answer language", () => {
  beforeEach(() => window.localStorage.clear());

  it("asks for the answer in the interface's language when none was chosen", async () => {
    const api = stubApi();
    render(inLocale("pt-BR"));
    await screen.findByText("Coletando o histórico da linha…");
    expect(api.digLanguage()).toBe("pt");
    expect(window.localStorage.getItem("gi:lang")).toBeNull();
  });

  it("asks in the language chosen before, whatever the interface", async () => {
    window.localStorage.setItem("gi:lang", "en");
    const api = stubApi();
    render(inLocale("pt-BR"));
    await screen.findByText("Coletando o histórico da linha…");
    expect(api.digLanguage()).toBe("en");
  });

  it("leaves an answer as it is when only the interface language changes", async () => {
    const api = stubApi();
    const { rerender } = render(inLocale("en"));
    await screen.findByText("Collecting the line's history…");
    await act(async () => {
      api.evidence();
      api.final("en");
    });
    const region = why();
    await waitFor(() => expect(clauses(region).length).toBeGreaterThan(0));

    rerender(inLocale("pt-BR"));
    const analysis = within(region).getByRole("group", { name: "Idioma da análise" });
    expect(within(analysis).getByRole("button", { name: "EN" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(region.querySelector("li[data-clause] [lang]")!.getAttribute("lang")).toBe("en");
    expect(requests(api, "/api/narrate")).toHaveLength(0);
    expect(requests(api, "/api/dig")).toHaveLength(1);
    expect(window.localStorage.getItem("gi:lang")).toBeNull();
  });

  it("rewrites the answer when its own language is changed, in either interface", async () => {
    const api = stubApi();
    render(inLocale("pt-BR"));
    await screen.findByText("Coletando o histórico da linha…");
    await act(async () => {
      api.evidence();
      api.final("en");
    });
    const region = screen.getByRole("region", { name: "O porquê reconstruído" });
    await waitFor(() => expect(clauses(region).length).toBeGreaterThan(0));
    expect(requests(api, "/api/narrate")).toHaveLength(0);

    const analysis = within(region).getByRole("group", { name: "Idioma da análise" });
    fireEvent.click(within(analysis).getByRole("button", { name: "PT" }));
    await within(region).findByText("reescrevendo em português…");
    expect(requests(api, "/api/narrate").map((c) => c.body?.language)).toEqual(["pt"]);
    expect(window.localStorage.getItem("gi:lang")).toBe("pt");
    await act(async () => api.narrate("pt"));
    await waitFor(() =>
      expect(region.querySelector("li[data-clause] [lang]")!.getAttribute("lang")).toBe("pt"),
    );
  });

  it("brings an answer into the language chosen before, as it always did", async () => {
    window.localStorage.setItem("gi:lang", "pt");
    const api = stubApi();
    render(inLocale("en"));
    await screen.findByText("Collecting the line's history…");
    expect(api.digLanguage()).toBe("pt");
    await act(async () => {
      api.evidence();
      api.final("en");
    });
    await waitFor(() =>
      expect(requests(api, "/api/narrate").map((c) => c.body?.language)).toEqual(["pt"]),
    );
  });
});
