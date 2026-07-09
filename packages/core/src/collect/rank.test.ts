import { describe, expect, it } from "vitest";
import { rankByHistory, rankShallow } from "./rank";

describe("rankShallow", () => {
  it("prefers real source files over docs", () => {
    expect(rankShallow(["README.md", "src/main.ts"])[0]).toBe("src/main.ts");
  });

  it("pushes noise (lockfiles, assets, generated types) to the bottom", () => {
    const out = rankShallow(["package-lock.json", "src/a.ts", "logo.svg", "types.d.ts"]);
    expect(out[0]).toBe("src/a.ts");
    expect(out[out.length - 1]).toMatch(/lock|svg|d\.ts$/);
  });

  it("caps the result at the requested limit", () => {
    expect(rankShallow(["a.ts", "b.ts", "c.ts", "d.ts"], 2)).toHaveLength(2);
  });

  it("surfaces source among a pile of READMEs (the llama.cpp regression)", () => {
    const files = ["x/README.md", "y/README.md", "z/README.md", "src/main.cpp", "convert.py"];
    const out = rankShallow(files, 3);
    expect(out).toContain("src/main.cpp");
    expect(out).toContain("convert.py");
  });

  it("is deterministic and does not mutate its input", () => {
    const input = ["b.ts", "a.ts"];
    const copy = [...input];
    rankShallow(input);
    expect(input).toEqual(copy);
  });
});

describe("rankByHistory", () => {
  it("surfaces the most-churned source file first", () => {
    const churn = new Map([
      ["src/a.ts", 1],
      ["src/b.ts", 5],
      ["src/c.ts", 3],
    ]);
    expect(rankByHistory(["src/a.ts", "src/b.ts", "src/c.ts"], churn)).toEqual([
      "src/b.ts",
      "src/c.ts",
      "src/a.ts",
    ]);
  });

  it("drops files with no recent history", () => {
    const churn = new Map([["src/hot.ts", 4]]);
    expect(rankByHistory(["src/hot.ts", "src/cold.ts"], churn)).toEqual(["src/hot.ts"]);
  });

  it("excludes tests, noise, and non-source even when churned", () => {
    const churn = new Map([
      ["src/real.ts", 2],
      ["src/real.test.ts", 9],
      ["src/__tests__/x.ts", 9],
      ["pnpm-lock.yaml", 9],
      ["README.md", 9],
    ]);
    expect(rankByHistory(
      ["src/real.ts", "src/real.test.ts", "src/__tests__/x.ts", "pnpm-lock.yaml", "README.md"],
      churn,
    )).toEqual(["src/real.ts"]);
  });

  it("caps the result at the requested limit", () => {
    const churn = new Map([
      ["a.ts", 3],
      ["b.ts", 2],
      ["c.ts", 1],
    ]);
    expect(rankByHistory(["a.ts", "b.ts", "c.ts"], churn, 2)).toHaveLength(2);
  });
});
