import { afterEach, describe, expect, it, vi } from "vitest";
import type { DigStreamMessage, Evidence, VerifiedNarrative } from "@understory/core";
import { renderResult } from "../webview/render";
import { runDig } from "./dig";
import { DigError } from "./errors";

const BACKEND = "https://understory.test";
const REQUEST = { repoPath: "https://github.com/acme/payments", location: "src/a.ts:8" };

function evidence(): Evidence {
  return {
    question: "Why is this line the way it is?",
    repo: { path: "/repo/payments", name: "payments", branch: "main" },
    location: { file: "src/a.ts", startLine: 8, endLine: 8 },
    artifacts: [],
    contradictions: [],
  };
}

function narrative(): VerifiedNarrative {
  return {
    answer: "Because the record says so.",
    citations: [],
    claims: [],
    recorded: true,
    answerable: true,
    grounded: true,
    unknownCitations: [],
    ungroundedClaims: 0,
    confidence: {
      score: 0.9,
      level: "high",
      primarySources: 2,
      corroborating: 1,
      contradicting: 0,
    },
  };
}

const line = (m: DigStreamMessage) => `${JSON.stringify(m)}\n`;

function stream(chunks: string[], { close = true } = {}) {
  const cancel = vi.fn();
  const enc = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(enc.encode(c));
      if (close) controller.close();
    },
    cancel,
  });
  const response = new Response(body, {
    status: 200,
    headers: { "content-type": "application/x-ndjson; charset=utf-8" },
  });
  return { response, cancel };
}

function serve(response: Response) {
  const fetch = vi.fn(async () => response);
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

const run = (signal = new AbortController().signal) => runDig(BACKEND, REQUEST, signal);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("runDig reads /api/dig as newline-delimited JSON", () => {
  it("builds the result from the evidence and final lines, even when a line spans chunks", async () => {
    const ev = evidence();
    const nar = narrative();
    const body =
      line({ phase: "evidence", evidence: ev }) + line({ phase: "final", narrative: nar });
    const fetch = serve(stream([body.slice(0, 7), body.slice(7, 150), body.slice(150)]).response);

    await expect(run()).resolves.toEqual({ evidence: ev, narrative: nar });
    expect(fetch).toHaveBeenCalledWith(
      `${BACKEND}/api/dig`,
      expect.objectContaining({ method: "POST", body: JSON.stringify(REQUEST) }),
    );
  });

  it("keeps the evidence and carries the final line's error into the result the panel shows", async () => {
    const ev = evidence();
    const error = "The write-up model is rate-limited.";
    serve(
      stream([
        line({ phase: "evidence", evidence: ev }),
        line({ phase: "final", narrative: null, error }),
      ]).response,
    );

    const result = await run();

    expect(result).toEqual({ evidence: ev, narrative: null, error });
    expect(renderResult("n0nce", result, "src/a.ts:8")).toContain(error);
  });

  it("does not wait for the lineage walk once the final line has arrived", async () => {
    const ev = evidence();
    const { response, cancel } = stream(
      [line({ phase: "evidence", evidence: ev }), line({ phase: "final", narrative: null })],
      { close: false },
    );
    serve(response);

    await expect(run()).resolves.toEqual({ evidence: ev, narrative: null });
    expect(cancel).toHaveBeenCalled();
  });

  it("ignores a lineage line", async () => {
    const ev = evidence();
    serve(
      stream([
        line({ phase: "evidence", evidence: ev }),
        line({ phase: "lineage", lineage: { entries: [], stopped: "depth limit" }, ms: 5 }),
        line({ phase: "final", narrative: null }),
      ]).response,
    );

    const result = await run();

    expect(result.evidence.lineage).toBeUndefined();
  });

  it("says the written answer is missing when the stream ends after the evidence", async () => {
    const ev = evidence();
    serve(stream([line({ phase: "evidence", evidence: ev })]).response);

    await expect(run()).resolves.toEqual({
      evidence: ev,
      narrative: null,
      error: "The backend stopped before sending the written answer.",
    });
  });

  it("fails when the stream carries no evidence", async () => {
    serve(stream([]).response);

    const err = await run().catch((e: unknown) => e);

    expect(err).toBeInstanceOf(DigError);
    expect(err).toMatchObject({
      kind: "unknown",
      message: "The backend finished without sending any evidence.",
    });
  });

  it("reports a cancel during the stream as cancelled", async () => {
    const enc = new TextEncoder();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(enc.encode(line({ phase: "evidence", evidence: evidence() })));
            init.signal?.addEventListener("abort", () => controller.error(init.signal?.reason));
          },
        });
        return new Response(body, { headers: { "content-type": "application/x-ndjson" } });
      }),
    );
    const controller = new AbortController();

    const pending = run(controller.signal).catch((e: unknown) => e);
    await new Promise((r) => setTimeout(r, 0));
    controller.abort();
    const err = await pending;

    expect(err).toBeInstanceOf(DigError);
    expect(err).toMatchObject({ kind: "cancelled" });
  });
});

describe("runDig with a response that is not a stream", () => {
  it("still reads a single JSON result", async () => {
    const ev = evidence();
    serve(
      new Response(JSON.stringify({ evidence: ev, narrative: null }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(run()).resolves.toEqual({ evidence: ev, narrative: null });
  });

  it("keeps the backend's error message on a non-2xx JSON response", async () => {
    serve(
      new Response(
        JSON.stringify({ error: "repoPath and either a location or a target are required" }),
        { status: 400, headers: { "content-type": "application/json" } },
      ),
    );

    const err = await run().catch((e: unknown) => e);

    expect(err).toBeInstanceOf(DigError);
    expect(err).toMatchObject({
      kind: "http",
      message: "Backend returned 400 — repoPath and either a location or a target are required",
    });
  });
});
