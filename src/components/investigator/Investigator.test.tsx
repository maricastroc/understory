import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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
    fireEvent.click(screen.getByRole("button", { name: other.toUpperCase() }));
    await within(region).findByText(`rewriting in ${other === "pt" ? "Portuguese" : "English"}…`);
    expect(clauses(region)).toHaveLength(count);
    expect(within(region).queryByRole("status")).toBeNull();

    await act(async () => api.narrate(other));
    await within(region).findByText("select a clause to check its evidence");
    expect(clauses(region)).toHaveLength(count);
    expect(why()).toBe(region);
  });
});
