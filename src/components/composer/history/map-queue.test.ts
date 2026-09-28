import { describe, expect, it, vi } from "vitest";
import { MapQueue } from "./map-queue";

const tick = () => new Promise((r) => setTimeout(r, 0));

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}

describe("MapQueue", () => {
  it("runs one job at a time, in order", async () => {
    const q = new MapQueue();
    const a = deferred();
    const order: string[] = [];
    q.enqueue({ key: "a", run: async () => (order.push("a"), a.promise) });
    q.enqueue({ key: "b", run: async () => void order.push("b") });
    await tick();
    expect(order).toEqual(["a"]);
    a.resolve();
    await tick();
    await tick();
    expect(order).toEqual(["a", "b"]);
  });

  it("does not start jobs while paused, and resumes after", async () => {
    const q = new MapQueue();
    const run = vi.fn(async () => {});
    q.setPaused(true);
    q.enqueue({ key: "a", run });
    await tick();
    expect(run).not.toHaveBeenCalled();
    q.setPaused(false);
    await tick();
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("clear aborts the running job, drops the rest and reports what was dropped", async () => {
    const q = new MapQueue();
    let signal: AbortSignal | null = null;
    q.enqueue({ key: "a", run: (s) => ((signal = s), new Promise(() => {})) });
    q.enqueue({ key: "b", run: async () => {} });
    await tick();
    expect(q.clear()).toEqual(["a", "b"]);
    expect(signal!.aborted).toBe(true);
    expect(q.size).toBe(0);
  });

  it("ignores a job already queued or running, and can put urgent work first", async () => {
    const q = new MapQueue();
    q.setPaused(true);
    const order: string[] = [];
    q.enqueue({ key: "a", run: async () => void order.push("a") });
    q.enqueue({ key: "a", run: async () => void order.push("dup") });
    q.enqueue({ key: "open", run: async () => void order.push("open") }, true);
    q.setPaused(false);
    for (let i = 0; i < 4; i++) await tick();
    expect(order).toEqual(["open", "a"]);
  });

  it("tells when it drains", async () => {
    const idle = vi.fn();
    const q = new MapQueue(idle);
    q.enqueue({ key: "a", run: async () => {} });
    for (let i = 0; i < 3; i++) await tick();
    expect(idle).toHaveBeenCalled();
  });
});
