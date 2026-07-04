import { describe, expect, it } from "vitest";
import { rankShallow } from "./rank";

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
