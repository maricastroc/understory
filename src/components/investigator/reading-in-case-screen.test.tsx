import type { DigResult } from "@understory/core/types";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import controls from "../line-investigation/fixtures/control-cases.json";
import { Investigator } from "./Investigator";

const params = vi.hoisted(
  () => new URLSearchParams("repo=palantir/tslint&file=src/linter.ts&line=189"),
);

vi.mock("next/navigation", () => ({ useSearchParams: () => params }));

const BORROWED = (controls.cases as unknown as Record<string, DigResult>)["tslint-189"];

function stubApi(result: DigResult) {
  const { evidence, narrative } = result;
  const code = evidence.code!;
  const content = [...Array(code.startLine - 1).fill(""), ...code.lines].join("\n");
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  const dig = new ReadableStream<Uint8Array>({ start: (c) => void (controller = c) });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      const path = new URL(input, "http://localhost").pathname;
      if (path === "/api/dig")
        return new Response(dig, { headers: { "content-type": "application/x-ndjson" } });
      if (path === "/api/file") return Response.json({ content: `${content}\n` });
      if (path === "/api/blame") return Response.json({ spans: [] });
      if (path === "/api/investigations")
        return Response.json({ investigations: [], persisted: false });
      return Response.json({ error: "not stubbed" }, { status: 404 });
    }),
  );
  const push = (line: object) => controller!.enqueue(encoder.encode(`${JSON.stringify(line)}\n`));
  return async () => {
    await screen.findByText("Collecting the line's history…");
    await act(async () => {
      push({ phase: "evidence", evidence });
      push({ phase: "final", narrative });
      controller!.close();
    });
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("the case screen with the reading", () => {
  it("shows what the history supports, an answer without the check, and the note on a likely explanation's source", async () => {
    const answer = stubApi(BORROWED);
    render(<Investigator reading />);
    await answer();
    const zone = await screen.findByRole("region", { name: "What the history supports" });
    const row = await within(zone).findByRole("button", { name: /Likely explanation/ });
    expect(row.textContent).toContain(BORROWED.narrative!.claims[0].text);
    expect(zone.textContent).not.toContain("Documented for this line");
    const chip = screen.getByRole("button", { name: /^Answered/ });
    expect(chip.querySelector("svg")).toBeNull();
    fireEvent.click(row);
    expect(document.querySelector("[data-likely-note]")?.textContent).toContain(
      "Its link to this line is Understory's interpretation.",
    );
    expect(screen.getByRole("link", { name: /GitHub/ })).toBeTruthy();
  });

  it("is the screen as it was without the reading", async () => {
    const answer = stubApi(BORROWED);
    render(<Investigator />);
    await answer();
    await screen.findByRole("region", { name: "Reconstructed why" });
    expect(screen.queryByRole("region", { name: "What the history supports" })).toBeNull();
    expect(await screen.findByRole("button", { name: /^Resolved/ })).toBeTruthy();
  });
});
