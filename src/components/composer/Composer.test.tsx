import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Composer } from "./Composer";
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

const requested: string[] = [];

function mockFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      requested.push(url);
      if (url.startsWith("/api/overview")) return Response.json(syntheticOverview);
      if (url.startsWith("/api/file")) {
        return Response.json({
          path: "src/billing/charge.ts",
          content: "a\nb\nc\nd\ne\nf\ng\nh\n",
        });
      }
      return Response.json({ files: [] });
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  requested.length = 0;
});

function setup() {
  mockFetch();
  return render(
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
    />,
  );
}

const trail = () => within(screen.getByRole("navigation", { name: "Investigation setup" }));

describe("Composer — new investigation", () => {
  it("opens on the file stage, asks the tree for the user's case files first, and never maps", async () => {
    setup();
    expect(screen.getByRole("heading", { level: 1, name: "New investigation" })).toBeTruthy();
    expect(trail().getByRole("button", { name: "file" }).getAttribute("aria-current")).toBe("step");
    await screen.findByRole("heading", { name: "History of current lines" });
    const overview = requested.find((u) => u.startsWith("/api/overview"))!;
    expect(new URLSearchParams(overview.split("?")[1]).getAll("case")).toEqual([
      "src/billing/charge.ts",
      "src/billing/refund.ts",
    ]);
    expect(requested.some((u) => /history-map|blame|dig/.test(u))).toBe(false);
  });

  it("clicking a file in the map opens the code stage and fills the trail", async () => {
    setup();
    await screen.findByRole("heading", { name: "History of current lines" });
    fireEvent.click(screen.getByRole("button", { name: /^src\/billing\/charge\.ts,/ }));
    await waitFor(() =>
      expect(trail().getByRole("button", { name: "src/billing/charge.ts" })).toBeTruthy(),
    );
    expect(trail().getByRole("button", { name: "line" }).getAttribute("aria-current")).toBe("step");
    expect(screen.queryByRole("heading", { name: "History of current lines" })).toBeNull();
    fireEvent.click(trail().getByRole("button", { name: "src/billing/charge.ts" }));
    expect(await screen.findByRole("heading", { name: "History of current lines" })).toBeTruthy();
    expect(requested.some((u) => /history-map|blame|dig/.test(u))).toBe(false);
  });

  it("the repository slot goes back to the repository stage", async () => {
    setup();
    fireEvent.click(trail().getByRole("button", { name: "acme/payments-service" }));
    expect(screen.getByRole("textbox", { name: "Repository" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Open demo/ })).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /Explain a pull request instead/ }).getAttribute("href"),
    ).toBe("/pr");
  });
});
