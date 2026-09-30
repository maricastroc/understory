import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { InvestigateInput } from "@understory/core/types";
import { afterEach, describe, expect, it, vi } from "vitest";
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

const repo: Repo = {
  connecting: false,
  ready: true,
  meta: syntheticMeta,
  error: null,
  open: vi.fn(async () => {}),
  reset: vi.fn(),
};

type MapCall = { mode: string; files: string[]; signal: AbortSignal | undefined };

const CHARGE = [
  "import { gateway } from './gateway';",
  "",
  "export function chargeCustomer(id: string) {",
  "  const retries = 3;",
  "  return gateway.charge(id, { retries });",
  "}",
  "",
].join("\n");

function mockFetch(opts: { hang?: boolean; content?: string } = {}) {
  const requested: string[] = [];
  const mapCalls: MapCall[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      requested.push(url);
      if (url.startsWith("/api/overview")) return Response.json(syntheticOverview);
      if (url.startsWith("/api/history-map")) {
        const body = JSON.parse(String(init?.body));
        const call = {
          mode: body.mode,
          files: body.files.map((f: { path: string }) => f.path),
          signal: init?.signal ?? undefined,
        };
        mapCalls.push(call);
        if (body.mode === "cached") return Response.json({ files: [] });
        if (opts.hang) {
          return new Promise<Response>((_, reject) =>
            init?.signal?.addEventListener("abort", () =>
              reject(new DOMException("", "AbortError")),
            ),
          );
        }
        return Response.json({ files: call.files.map(syntheticHistory) });
      }
      if (url.startsWith("/api/file")) {
        return Response.json({
          path: "src/billing/charge.ts",
          content: opts.content ?? "a\nb\nc\nd\ne\nf\ng\nh\n",
        });
      }
      return Response.json({ files: [] });
    }),
  );
  return { requested, mapCalls };
}

afterEach(() => vi.unstubAllGlobals());

function setup(
  props: {
    active?: boolean;
    investigating?: boolean;
    onInvestigate?: (input: InvestigateInput) => void;
  } = {},
) {
  const view = render(
    <Composer
      repo={repo}
      repoPath="acme/payments-service"
      setRepoPath={() => {}}
      token=""
      setToken={() => {}}
      onInvestigate={() => {}}
      cases={{
        ordered: ["src/billing/charge.ts", "src/billing/refund.ts"],
        counts: syntheticCaseCounts,
      }}
      demoRepo=".demo/payments-service"
      {...props}
    />,
  );
  return {
    ...view,
    rerenderWith: (next: { active?: boolean; investigating?: boolean }) =>
      view.rerender(
        <Composer
          repo={repo}
          repoPath="acme/payments-service"
          setRepoPath={() => {}}
          token=""
          setToken={() => {}}
          onInvestigate={() => {}}
          cases={{
            ordered: ["src/billing/charge.ts", "src/billing/refund.ts"],
            counts: syntheticCaseCounts,
          }}
          demoRepo=".demo/payments-service"
          {...next}
        />,
      ),
  };
}

const trail = () => within(screen.getByRole("navigation", { name: "Investigation path" }));
const sleep = (ms: number) => act(() => new Promise((r) => setTimeout(r, ms)));

describe("Composer — new investigation", () => {
  it("asks the tree for the user's case files first, then only the cache, then maps three after idle", async () => {
    const { requested, mapCalls } = mockFetch();
    setup();
    await screen.findByRole("heading", { name: "History of current lines" });
    const overview = requested.find((u) => u.startsWith("/api/overview"))!;
    expect(new URLSearchParams(overview.split("?")[1]).getAll("case")).toEqual([
      "src/billing/charge.ts",
      "src/billing/refund.ts",
    ]);
    await waitFor(() => expect(mapCalls).toHaveLength(1));
    expect(mapCalls[0]).toMatchObject({ mode: "cached" });
    expect(mapCalls[0].files).toHaveLength(14);
    await sleep(600);
    expect(mapCalls).toHaveLength(1);
    await waitFor(() => expect(mapCalls).toHaveLength(2), { timeout: 2000 });
    expect(mapCalls[1]).toMatchObject({
      mode: "map",
      files: ["src/billing/charge.ts", "src/billing/refund.ts", "src/webhooks/router.ts"],
    });
    await screen.findByText("3 of 14 mapped");
    await sleep(1300);
    expect(mapCalls).toHaveLength(2);
    expect(requested.some((u) => /\/api\/(blame|dig)/.test(u))).toBe(false);
  });

  it("does not start mapping while an investigation request is in flight", async () => {
    const { mapCalls } = mockFetch();
    const { rerenderWith } = setup({ investigating: true });
    await screen.findByRole("heading", { name: "History of current lines" });
    await sleep(1500);
    expect(mapCalls.filter((c) => c.mode === "map")).toHaveLength(0);
    rerenderWith({ investigating: false });
    await waitFor(() => expect(mapCalls.filter((c) => c.mode === "map")).toHaveLength(1), {
      timeout: 2000,
    });
  });

  it("aborts mapping when the screen is left and returns the files to not mapped", async () => {
    const { mapCalls } = mockFetch({ hang: true });
    const { rerenderWith } = setup();
    await screen.findByRole("heading", { name: "History of current lines" });
    await waitFor(() => expect(mapCalls.filter((c) => c.mode === "map")).toHaveLength(1), {
      timeout: 2500,
    });
    expect(screen.getByText("0 of 14 mapped · mapping 3")).toBeTruthy();
    rerenderWith({ active: false });
    const auto = mapCalls.find((c) => c.mode === "map")!;
    expect(auto.signal?.aborted).toBe(true);
    await waitFor(() => expect(screen.getByText("0 of 14 mapped")).toBeTruthy());
  });

  it("opening a file maps that file and fills the trail", async () => {
    const { mapCalls } = mockFetch();
    setup();
    await screen.findByRole("heading", { name: "History of current lines" });
    fireEvent.click(screen.getByRole("button", { name: /^src\/lib\/log\.ts,/ }));
    await waitFor(() =>
      expect(trail().getByRole("button", { name: /^02 file: src\/lib\/log\.ts/ })).toBeTruthy(),
    );
    await waitFor(() =>
      expect(mapCalls.some((c) => c.mode === "map" && c.files.join() === "src/lib/log.ts")).toBe(
        true,
      ),
    );
    expect(trail().queryByRole("button", { name: /^03 line/ })).toBeNull();
    expect(
      trail()
        .getByText("03 line, current step")
        .closest("[aria-current]")
        ?.getAttribute("aria-current"),
    ).toBe("step");
  });

  it("the repository slot goes back to the repository stage", async () => {
    mockFetch();
    setup();
    fireEvent.click(
      trail().getByRole("button", { name: /^01 repository: acme\/payments-service/ }),
    );
    expect(screen.getByRole("heading", { level: 2, name: "Open a repository" })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Repository" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Open the demo/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Sign in with GitHub/ })).toBeNull();
  });
});

describe("Composer — choosing lines and asking", () => {
  async function openCharge() {
    const onInvestigate = vi.fn();
    mockFetch({ content: CHARGE });
    setup({ onInvestigate });
    await screen.findByRole("heading", { name: "History of current lines" });
    fireEvent.click(screen.getByRole("button", { name: /^src\/billing\/charge\.ts,/ }));
    await screen.findByRole("button", { name: /^Line 4\./ });
    return onInvestigate;
  }
  const line = (n: number) => screen.getByRole("button", { name: new RegExp(`^Line ${n}[,.]`) });
  const selected = () =>
    screen
      .getAllByRole("button", { pressed: true })
      .map((b) => Number(b.getAttribute("aria-label")!.match(/^Line (\d+)/)![1]));

  it("investigates with the general question when no question is typed", async () => {
    const onInvestigate = await openCharge();
    fireEvent.click(line(4));
    expect(screen.queryByRole("textbox", { name: /Your question/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Ask a specific question/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Investigate line 4 →" }));
    expect(onInvestigate).toHaveBeenCalledWith({
      repoPath: "acme/payments-service",
      location: "src/billing/charge.ts:4",
      question: "Why is this line the way it is?",
    });
  });

  it("sends a specific question when one is asked, and can drop it again", async () => {
    const onInvestigate = await openCharge();
    fireEvent.click(line(4));
    fireEvent.click(screen.getByRole("button", { name: /Ask a specific question/ }));
    const box = screen.getByRole("textbox", { name: "Your question about line 4" });
    fireEvent.click(screen.getByRole("button", { name: "Why this value?" }));
    expect((box as HTMLTextAreaElement).value).toBe("Why this value?");
    fireEvent.click(screen.getByRole("button", { name: "Investigate line 4 →" }));
    expect(onInvestigate).toHaveBeenLastCalledWith(
      expect.objectContaining({ question: "Why this value?" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Use the general question instead" }));
    expect(screen.queryByRole("textbox", { name: /Your question/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Investigate line 4 →" }));
    expect(onInvestigate).toHaveBeenLastCalledWith(
      expect.objectContaining({ question: "Why is this line the way it is?" }),
    );
  });

  it("investigates the whole enclosing function in one click", async () => {
    const onInvestigate = await openCharge();
    fireEvent.click(line(4));
    fireEvent.click(
      screen.getByRole("button", {
        name: "Investigate the whole function chargeCustomer 4 lines",
      }),
    );
    expect(onInvestigate).toHaveBeenCalledWith({
      repoPath: "acme/payments-service",
      location: "src/billing/charge.ts:3-6",
      question: "Why is chargeCustomer the way it is?",
    });
    expect(selected()).toEqual([3, 4, 5, 6]);
    expect(screen.queryByRole("button", { name: /Investigate the whole/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Investigate chargeCustomer →" })).toBeTruthy();
  });

  it("selects a range by dragging across lines", async () => {
    const onInvestigate = await openCharge();
    fireEvent.pointerDown(line(2), { pointerType: "mouse", button: 0, buttons: 1 });
    fireEvent.pointerEnter(line(3), { pointerType: "mouse", buttons: 1 });
    fireEvent.pointerEnter(line(5), { pointerType: "mouse", buttons: 1 });
    fireEvent.pointerUp(window, { pointerType: "mouse" });
    fireEvent.click(line(5));
    expect(selected()).toEqual([2, 3, 4, 5]);
    fireEvent.pointerEnter(line(6), { pointerType: "mouse", buttons: 0 });
    expect(selected()).toEqual([2, 3, 4, 5]);
    fireEvent.click(screen.getByRole("button", { name: "Investigate lines 2–5 →" }));
    expect(onInvestigate).toHaveBeenCalledWith(
      expect.objectContaining({
        location: "src/billing/charge.ts:2-5",
        question: "Why are these lines the way they are?",
      }),
    );
  });

  it("still selects with a plain click and extends with shift-click", async () => {
    await openCharge();
    fireEvent.click(line(5));
    fireEvent.click(line(2), { shiftKey: true });
    expect(selected()).toEqual([2, 3, 4, 5]);
    fireEvent.click(line(6));
    expect(selected()).toEqual([6]);
  });
});

describe("Composer — the demo line", () => {
  function renderWith(props: Partial<React.ComponentProps<typeof Composer>>) {
    return render(
      <Composer
        repo={repo}
        repoPath=".demo/payments-service"
        setRepoPath={() => {}}
        token=""
        setToken={() => {}}
        onInvestigate={() => {}}
        cases={{ ordered: [], counts: new Map() }}
        demoRepo=".demo/payments-service"
        {...props}
      />,
    );
  }

  it("opens the prefilled file with the line already selected", async () => {
    mockFetch();
    renderWith({ prefill: { path: "src/billing/charge.ts", line: 4, nonce: 1 } });
    const line = await screen.findByRole("button", { name: /^Line 4, selected/ });
    expect(line.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("heading", { level: 2, name: "Ask about line 4" })).toBeTruthy();
    expect(
      trail().getByRole("button", { name: /^02 file: src\/billing\/charge\.ts/ }),
    ).toBeTruthy();
  });

  it("asks for the demo line again when the demo is reopened", () => {
    mockFetch();
    const onDemoOpened = vi.fn();
    renderWith({ onDemoOpened });
    fireEvent.click(trail().getByRole("button", { name: /^01 repository/ }));
    fireEvent.click(screen.getByRole("button", { name: /Open the demo/ }));
    expect(repo.open).toHaveBeenLastCalledWith(".demo/payments-service", undefined);
    expect(onDemoOpened).toHaveBeenCalledTimes(1);
  });
});
