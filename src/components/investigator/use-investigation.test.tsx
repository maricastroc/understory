import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { syntheticRetryCap } from "../line-investigation/fixtures/synthetic-retry-cap";
import { useInvestigation } from "./use-investigation";

const FORM = {
  repoPath: "synthetic/payments-service",
  location: "src/billing/charge.ts:9",
  question: "Why exactly 3 retries?",
};

type Route = (init?: RequestInit) => Promise<Response>;

function stubFetch(dig: Route) {
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === "/api/investigations") {
      return Response.json({ investigations: [], persisted: false });
    }
    if (url === "/api/dig") return dig(init);
    throw new Error(`unexpected ${url}`);
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

function ndjson() {
  let push: (line: object) => void = () => {};
  let end: () => void = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      push = (line) => controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`));
      end = () => controller.close();
    },
  });
  const response = new Response(stream, { headers: { "content-type": "application/x-ndjson" } });
  return { response, push: (line: object) => push(line), end: () => end() };
}

async function mounted() {
  const hook = renderHook(() => useInvestigation(null));
  await waitFor(() => expect(hook.result.current.loaded).toBe(true));
  return hook;
}

afterEach(() => vi.unstubAllGlobals());

describe("useInvestigation — a line case before its evidence arrives", () => {
  it("shows a draft while collecting and hands its key to the case that replaces it", async () => {
    const stream = ndjson();
    stubFetch(async () => stream.response);
    const { result } = await mounted();

    let done: Promise<void> = Promise.resolve();
    act(() => {
      done = result.current.investigate(FORM);
    });
    await waitFor(() => expect(result.current.draft).not.toBeNull());
    const key = result.current.draft!.key;
    expect(result.current.draft).toMatchObject({ form: FORM, error: null });
    expect(result.current.view).toBe("case");
    expect(result.current.current).toBeNull();

    await act(async () => {
      stream.push({ phase: "evidence", evidence: syntheticRetryCap.evidence });
    });
    await waitFor(() => expect(result.current.current?.pending).toBe(true));
    expect(result.current.draft).toBeNull();
    expect(result.current.current?.mountKey).toBe(key);

    await act(async () => {
      stream.push({ phase: "final", narrative: syntheticRetryCap.narrative });
      stream.end();
      await done;
    });
    expect(result.current.current?.pending).toBe(false);
    expect(result.current.current?.mountKey).toBe(key);
    expect(result.current.current?.result.narrative).not.toBeNull();
  });

  it("keeps the draft with the error in place and retries under the same key", async () => {
    const fetch = stubFetch(async () =>
      Response.json({ error: "Request failed" }, { status: 502 }),
    );
    const { result } = await mounted();

    await act(async () => {
      await result.current.investigate(FORM);
    });
    expect(result.current.draft).toMatchObject({ error: "Request failed", form: FORM });
    expect(result.current.error).toBeNull();
    expect(result.current.view).toBe("case");
    const key = result.current.draft!.key;

    await act(async () => {
      result.current.retryDraft();
    });
    await waitFor(() => expect(fetch.mock.calls.filter(([u]) => u === "/api/dig")).toHaveLength(2));
    expect(result.current.draft?.key).toBe(key);

    act(() => result.current.backToCode());
    expect(result.current.draft).toBeNull();
    expect(result.current.view).toBe("browse");
  });

  it("leaves drill-downs on the old path: no draft, error back in the composer", async () => {
    stubFetch(async () => Response.json({ error: "Not found" }, { status: 404 }));
    const { result } = await mounted();

    await act(async () => {
      await result.current.drillInto(
        "GI-2049",
        "Why?",
        { kind: "pull_request", id: "pr:812" },
        FORM.repoPath,
      );
    });
    expect(result.current.draft).toBeNull();
    expect(result.current.error).toBe("Not found");
    expect(result.current.view).toBe("browse");
  });
});

describe("useInvestigation — rewriting a case in another language", () => {
  const portuguese = {
    ...syntheticRetryCap.narrative!,
    language: "pt" as const,
    claims: syntheticRetryCap.narrative!.claims.map((c) => ({
      ...c,
      text: `Em português: ${c.text}`,
    })),
  };

  async function opened(narrate: Route) {
    const calls: Array<{ url: string; body: unknown }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url === "/api/investigations") {
          return Response.json({ investigations: [], persisted: false });
        }
        calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : null });
        if (url === "/api/dig") return Response.json(syntheticRetryCap);
        if (url === "/api/narrate") return narrate(init);
        throw new Error(`unexpected ${url}`);
      }),
    );
    const hook = await mounted();
    await act(async () => {
      await hook.result.current.investigate(FORM);
    });
    return { ...hook, calls };
  }

  it("rewrites the same evidence in the selected language and keeps the other one for later", async () => {
    const { result, calls } = await opened(async () => Response.json({ narrative: portuguese }));
    const id = result.current.current!.caseId;
    await act(async () => {
      await result.current.rewrite(id, "pt");
    });
    const narrate = calls.find((c) => c.url === "/api/narrate")!;
    expect(narrate.body).toEqual({ evidence: syntheticRetryCap.evidence, language: "pt" });
    expect(result.current.current?.result.narrative?.language).toBe("pt");
    expect(result.current.current?.result.evidence).toEqual(syntheticRetryCap.evidence);

    await act(async () => {
      await result.current.rewrite(id, "en");
    });
    expect(calls.filter((c) => c.url === "/api/narrate")).toHaveLength(1);
    expect(result.current.current?.result.narrative?.claims[0].text).toBe(
      syntheticRetryCap.narrative!.claims[0].text,
    );
  });

  it("keeps the text it has and says why when the rewrite fails", async () => {
    const { result } = await opened(async () =>
      Response.json({ narrative: null, error: "AI reconstruction is temporarily unavailable." }),
    );
    const id = result.current.current!.caseId;
    await act(async () => {
      await result.current.rewrite(id, "pt");
    });
    expect(result.current.current?.rewriteError).toEqual({
      language: "pt",
      message: "AI reconstruction is temporarily unavailable.",
    });
    expect(result.current.current?.rewriting).toBeNull();
    expect(result.current.current?.result.narrative).toEqual(syntheticRetryCap.narrative);
  });
});

describe("useInvestigation — the line's earlier history, sent after the answer", () => {
  const USER = { login: "synthetic", name: "Synthetic User", avatarUrl: "" };
  const lineage = {
    stopped: "the line was added" as const,
    entries: [
      {
        sha: "92f6a3f0000000000000000000000000000000ff",
        date: "2023-03-15T16:20:00Z",
        title: "Cap charge retries at 3, add backoff",
        did: "rewrote" as const,
        before: "while (true) {",
      },
      {
        sha: "7be210e0000000000000000000000000000000ff",
        date: "2021-06-18T10:00:00Z",
        title: "Add charge retries",
        did: "added" as const,
        before: null,
      },
    ],
  };
  const portuguese = { ...syntheticRetryCap.narrative!, language: "pt" as const };

  async function streaming(user: typeof USER | null, narrate?: Route) {
    const stream = ndjson();
    const saved: Array<{ result: { evidence: { lineage?: unknown }; narrative: unknown } }> = [];
    const narrated: Array<{ evidence: { lineage?: unknown } }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url === "/api/investigations") {
          if (init?.method === "POST") saved.push(JSON.parse(String(init.body)));
          return Response.json({ investigations: [], persisted: !!user });
        }
        if (url === "/api/dig") return stream.response;
        if (url === "/api/narrate" && narrate) {
          narrated.push(JSON.parse(String(init?.body)));
          return narrate(init);
        }
        throw new Error(`unexpected ${url}`);
      }),
    );
    const hook = renderHook(() => useInvestigation(user));
    await waitFor(() => expect(hook.result.current.loaded).toBe(true));
    let done: Promise<void> = Promise.resolve();
    act(() => {
      done = hook.result.current.investigate(FORM);
    });
    const send = (line: object) =>
      act(async () => {
        stream.push(line);
      });
    const answer = async () => {
      await send({ phase: "evidence", evidence: syntheticRetryCap.evidence });
      await waitFor(() => expect(hook.result.current.current?.pending).toBe(true));
      await send({ phase: "final", narrative: syntheticRetryCap.narrative });
      await waitFor(() => expect(hook.result.current.current?.pending).toBe(false));
    };
    const close = () =>
      act(async () => {
        stream.end();
        await done;
      });
    return { ...hook, send, answer, close, saved, narrated };
  }

  it("keeps the history on the case and leaves the answer as it was", async () => {
    const { result, send, answer, close } = await streaming(null);
    await answer();
    expect(result.current.current?.result.evidence.lineage).toBeUndefined();
    const before = result.current.current!.result;

    await send({ phase: "lineage", lineage, ms: 812 });
    await close();
    const after = result.current.current!.result;
    expect(after.evidence.lineage).toEqual(lineage);
    expect(after.narrative).toBe(before.narrative);
    expect({ ...after.evidence, lineage: undefined }).toEqual({
      ...before.evidence,
      lineage: undefined,
    });
    expect(result.current.current?.pending).toBe(false);
  });

  it("saves the case with its answer first, and again once the history is in", async () => {
    const { send, answer, close, saved } = await streaming(USER);
    await answer();
    await waitFor(() => expect(saved).toHaveLength(1));
    expect(saved[0].result.evidence.lineage).toBeUndefined();
    expect(saved[0].result.narrative).not.toBeNull();

    await send({ phase: "lineage", lineage });
    await close();
    await waitFor(() => expect(saved).toHaveLength(2));
    expect(saved[1].result.evidence.lineage).toEqual(lineage);
    expect(saved[1].result.narrative).toEqual(saved[0].result.narrative);
  });

  it("saves nothing more and shows nothing new when no history is sent", async () => {
    const { result, answer, close, saved } = await streaming(USER);
    await answer();
    await close();
    expect(saved).toHaveLength(1);
    expect(result.current.current?.result.evidence.lineage).toBeUndefined();
  });

  it("ignores a history line that has no answered case to join", async () => {
    const { result, send, answer, close, saved } = await streaming(USER);
    await send({ phase: "lineage", lineage });
    expect(result.current.current).toBeNull();
    await answer();
    await send({ phase: "lineage", lineage: null });
    await close();
    expect(result.current.current?.result.evidence.lineage).toBeUndefined();
    expect(saved).toHaveLength(1);
  });

  it("does not send the history back to be rewritten, and keeps it on the rewritten case", async () => {
    const { result, send, answer, close, saved, narrated } = await streaming(USER, async () =>
      Response.json({ narrative: portuguese }),
    );
    await answer();
    await send({ phase: "lineage", lineage });
    await close();
    const id = result.current.current!.caseId;
    await act(async () => {
      await result.current.rewrite(id, "pt");
    });
    expect(narrated).toHaveLength(1);
    expect("lineage" in narrated[0].evidence).toBe(false);
    expect(narrated[0].evidence).toEqual(syntheticRetryCap.evidence);
    expect(result.current.current?.result.narrative?.language).toBe("pt");
    expect(result.current.current?.result.evidence.lineage).toEqual(lineage);
    expect(saved.at(-1)?.result.evidence.lineage).toEqual(lineage);
  });

  it("keeps the history when a rewrite begun before it arrived ends after it", async () => {
    let release: (r: Response) => void = () => {};
    const { result, send, answer, close, saved } = await streaming(
      USER,
      () => new Promise<Response>((resolve) => (release = resolve)),
    );
    await answer();
    const id = result.current.current!.caseId;
    let rewriting: Promise<void> = Promise.resolve();
    act(() => {
      rewriting = result.current.rewrite(id, "pt");
    });
    await waitFor(() => expect(result.current.current?.rewriting).toBe("pt"));

    await send({ phase: "lineage", lineage });
    await close();
    await waitFor(() => expect(result.current.current?.result.evidence.lineage).toEqual(lineage));

    await act(async () => {
      release(Response.json({ narrative: portuguese }));
      await rewriting;
    });
    expect(result.current.current?.result.narrative?.language).toBe("pt");
    expect(result.current.current?.result.evidence.lineage).toEqual(lineage);
    expect(saved.at(-1)?.result).toMatchObject({
      narrative: { language: "pt" },
      evidence: { lineage },
    });
  });
});

describe("useInvestigation — the order in which a case's saves land", () => {
  const USER = { login: "synthetic", name: "Synthetic User", avatarUrl: "" };
  const lineage = {
    stopped: "the line was added" as const,
    entries: [
      {
        sha: "92f6a3f0000000000000000000000000000000ff",
        date: "2023-03-15T16:20:00Z",
        title: "Cap charge retries at 3, add backoff",
        did: "added" as const,
        before: null,
      },
    ],
  };
  const portuguese = { ...syntheticRetryCap.narrative!, language: "pt" as const };
  type Saved = { result: { evidence: { lineage?: unknown }; narrative: { language?: string } } };
  type Held = { body: Saved; open: boolean; finish: (ok?: boolean) => void };

  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
  async function held() {
    const stream = ndjson();
    const saves: Held[] = [];
    const removed: string[] = [];
    const database = { row: null as Saved | null, most: 0 };
    let answerRewrite: (r: Response) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: RequestInit) => {
        if (url === "/api/investigations" && init?.method === "POST")
          return new Promise<Response>((resolve, reject) => {
            const body = JSON.parse(String(init.body)) as Saved;
            const save: Held = {
              body,
              open: true,
              finish: (ok = true) => {
                save.open = false;
                if (!ok) return reject(new TypeError("Failed to fetch"));
                database.row = body;
                resolve(Response.json({ persisted: true }));
              },
            };
            saves.push(save);
            database.most = Math.max(database.most, saves.filter((x) => x.open).length);
          });
        if (url === "/api/investigations")
          return Promise.resolve(Response.json({ investigations: [], persisted: true }));
        if (url.startsWith("/api/investigations/") && init?.method === "DELETE") {
          removed.push(url);
          database.row = null;
          return Promise.resolve(Response.json({ deleted: true }));
        }
        if (url === "/api/dig") return Promise.resolve(stream.response);
        if (url === "/api/narrate")
          return new Promise<Response>((resolve) => (answerRewrite = resolve));
        throw new Error(`unexpected ${url}`);
      }),
    );
    const hook = renderHook(() => useInvestigation(USER));
    await waitFor(() => expect(hook.result.current.loaded).toBe(true));
    let done: Promise<void> = Promise.resolve();
    act(() => {
      done = hook.result.current.investigate(FORM);
    });
    const send = (line: object) =>
      act(async () => {
        stream.push(line);
      });
    await send({ phase: "evidence", evidence: syntheticRetryCap.evidence });
    await waitFor(() => expect(hook.result.current.current?.pending).toBe(true));
    await send({ phase: "final", narrative: syntheticRetryCap.narrative });
    await waitFor(() => expect(hook.result.current.current?.pending).toBe(false));
    await waitFor(() => expect(saves).toHaveLength(1));
    const landNewestFirst = async () => {
      for (let quiet = 0; quiet < 3;) {
        const open = saves.filter((x) => x.open);
        if (open.length === 0) quiet++;
        else quiet = 0;
        await act(async () => {
          open.at(-1)?.finish();
          await tick();
        });
      }
    };
    const close = () =>
      act(async () => {
        stream.end();
        await done;
      });
    return {
      ...hook,
      stream,
      send,
      close,
      saves,
      removed,
      database,
      landNewestFirst,
      rewriteAnswers: (r: Response) => answerRewrite(r),
    };
  }

  it("does not let the first save, landing late, write over the history", async () => {
    const { send, close, saves, database, landNewestFirst } = await held();
    await send({ phase: "lineage", lineage });
    await close();
    await landNewestFirst();
    expect(saves).toHaveLength(2);
    expect(database.row?.result.evidence.lineage).toEqual(lineage);
    expect(database.row?.result.narrative).not.toBeNull();
    expect(database.most).toBe(1);
  });

  it("sends the save with the history after the one before it failed", async () => {
    const { send, close, saves, database, landNewestFirst } = await held();
    await send({ phase: "lineage", lineage });
    await close();
    await act(async () => {
      saves[0].finish(false);
      await tick();
    });
    await landNewestFirst();
    expect(saves).toHaveLength(2);
    expect(database.row?.result.evidence.lineage).toEqual(lineage);
  });

  it("saves the rewritten answer with the history when the rewrite ends as the history arrives", async () => {
    const { result, stream, close, saves, database, landNewestFirst, rewriteAnswers } =
      await held();
    await landNewestFirst();
    const id = result.current.current!.caseId;
    let rewriting: Promise<void> = Promise.resolve();
    act(() => {
      rewriting = result.current.rewrite(id, "pt");
    });
    await waitFor(() => expect(result.current.current?.rewriting).toBe("pt"));
    await act(async () => {
      stream.push({ phase: "lineage", lineage });
      for (let i = 0; i < 5; i++) await tick();
      rewriteAnswers(Response.json({ narrative: portuguese }));
      await rewriting;
    });
    await close();
    await landNewestFirst();
    expect(result.current.current?.result).toMatchObject({
      narrative: { language: "pt" },
      evidence: { lineage },
    });
    expect(database.row?.result).toMatchObject({
      narrative: { language: "pt" },
      evidence: { lineage },
    });
    expect(database.most).toBe(1);
    expect(saves).toHaveLength(3);
  });

  it("saves both when the history arrives as the rewrite ends", async () => {
    const { result, stream, close, database, landNewestFirst, rewriteAnswers } = await held();
    await landNewestFirst();
    const id = result.current.current!.caseId;
    let rewriting: Promise<void> = Promise.resolve();
    act(() => {
      rewriting = result.current.rewrite(id, "pt");
    });
    await waitFor(() => expect(result.current.current?.rewriting).toBe("pt"));
    await act(async () => {
      rewriteAnswers(Response.json({ narrative: portuguese }));
      await rewriting;
      stream.push({ phase: "lineage", lineage });
      for (let i = 0; i < 5; i++) await tick();
    });
    await close();
    await landNewestFirst();
    expect(result.current.current?.result).toMatchObject({
      narrative: { language: "pt" },
      evidence: { lineage },
    });
    expect(database.row?.result).toMatchObject({
      narrative: { language: "pt" },
      evidence: { lineage },
    });
  });

  it("does not bring back a case removed before its history arrived", async () => {
    const { result, send, close, saves, removed, database, landNewestFirst } = await held();
    await landNewestFirst();
    const id = result.current.current!.caseId;
    act(() => result.current.removeCase(id));
    await waitFor(() => expect(removed).toEqual([`/api/investigations/${id}`]));
    await send({ phase: "lineage", lineage });
    await close();
    await landNewestFirst();
    expect(saves).toHaveLength(1);
    expect(database.row).toBeNull();
  });

  it("removes a case only after the save in flight has landed", async () => {
    const { result, close, saves, removed, database } = await held();
    const id = result.current.current!.caseId;
    act(() => result.current.removeCase(id));
    await act(async () => {
      await tick();
    });
    expect(removed).toEqual([]);
    await act(async () => {
      saves[0].finish();
      await tick();
    });
    await waitFor(() => expect(removed).toEqual([`/api/investigations/${id}`]));
    await close();
    expect(database.row).toBeNull();
  });
});
