import { describe, expect, it } from "vitest";
import { pickShownFiles } from "./pick-files";

const entry = (path: string) => ({ path, sha: path.padEnd(40, "0").slice(0, 40), size: 100 });

describe("pickShownFiles", () => {
  const entries = [
    "src/billing/charge.ts",
    "src/billing/refund.ts",
    "src/webhooks/router.ts",
    "src/lib/log.ts",
    "tests/charge.spec.ts",
    "package-lock.lock",
    "README.md",
  ].map(entry);

  it("puts files with cases first, then recent source churn, then paths, and never noise", () => {
    const shown = pickShownFiles({
      entries,
      churn: new Map([
        ["src/webhooks/router.ts", 3],
        ["src/lib/log.ts", 1],
        ["tests/charge.spec.ts", 5],
      ]),
      cases: ["src/billing/refund.ts", "gone.ts"],
      limit: 5,
    });
    expect(shown.map((f) => [f.path, f.reason])).toEqual([
      ["src/billing/refund.ts", "case"],
      ["src/webhooks/router.ts", "recent"],
      ["src/lib/log.ts", "recent"],
      ["tests/charge.spec.ts", "path"],
      ["src/billing/charge.ts", "path"],
    ]);
    expect(shown.every((f) => f.blobSha && f.size === 100)).toBe(true);
  });

  it("caps cases at five", () => {
    const many = Array.from({ length: 8 }, (_, i) => entry(`src/f${i}.ts`));
    const shown = pickShownFiles({
      entries: many,
      churn: new Map(),
      cases: many.map((e) => e.path),
    });
    expect(shown.filter((f) => f.reason === "case")).toHaveLength(5);
  });
});
