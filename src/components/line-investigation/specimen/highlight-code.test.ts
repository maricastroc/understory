import { describe, expect, it } from "vitest";
import { highlightLines } from "./highlight-code";

const kinds = (segments: ReturnType<typeof highlightLines>[number]) =>
  segments.map((s) => [s.kind, s.text]);

describe("highlightLines", () => {
  it("colours keywords and leaves the rest plain", () => {
    const [line] = highlightLines(["export async function chargeCustomer(req) {"], "a.ts");
    expect(kinds(line)).toEqual([
      ["keyword", "export"],
      ["plain", " "],
      ["keyword", "async"],
      ["plain", " "],
      ["keyword", "function"],
      ["plain", " chargeCustomer(req) {"],
    ]);
  });

  it("marks line comments and never colours keywords inside strings", () => {
    const [line] = highlightLines(['logger.warn("return // new", x); // for later'], "a.ts");
    expect(kinds(line)).toEqual([
      ["plain", 'logger.warn("return // new", x); '],
      ["comment", "// for later"],
    ]);
  });

  it("carries block comments across lines", () => {
    const lines = highlightLines(["/** start", " * return inside", " */ const x = 1;"], "a.ts");
    expect(lines[0]).toEqual([{ kind: "comment", text: "/** start" }]);
    expect(lines[1]).toEqual([{ kind: "comment", text: " * return inside" }]);
    expect(kinds(lines[2])).toEqual([
      ["comment", " */"],
      ["plain", " "],
      ["keyword", "const"],
      ["plain", " x = 1;"],
    ]);
  });

  it("uses the file's language", () => {
    const [py] = highlightLines(["def f(x):  # note"], "a.py");
    expect(kinds(py)[0]).toEqual(["keyword", "def"]);
    expect(kinds(py).at(-1)).toEqual(["comment", "# note"]);
  });

  it("renders unknown file types as plain text", () => {
    expect(highlightLines(["for x in y", ""], "notes.txt")).toEqual([
      [{ kind: "plain", text: "for x in y" }],
      [],
    ]);
  });
});
