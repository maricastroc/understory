import { describe, expect, it } from "vitest";
import { codeWindow, renderCode } from "./code-context";

const source = Array.from({ length: 12 }, (_, i) => `line ${i + 1}`).join("\n");
const at = (startLine: number, endLine = startLine) => ({ file: "a.ts", startLine, endLine });

describe("codeWindow", () => {
  it("takes the investigated line with three lines on each side", () => {
    expect(codeWindow(source, at(6))).toEqual({
      startLine: 3,
      lines: ["line 3", "line 4", "line 5", "line 6", "line 7", "line 8", "line 9"],
    });
  });

  it("stops at the edges of the file", () => {
    expect(codeWindow(source, at(1))?.lines).toEqual(["line 1", "line 2", "line 3", "line 4"]);
    expect(codeWindow(source, at(12))).toEqual({
      startLine: 9,
      lines: ["line 9", "line 10", "line 11", "line 12"],
    });
  });

  it("gives nothing for a line the file does not have", () => {
    expect(codeWindow(source, at(13))).toBeNull();
    expect(codeWindow("", at(9))).toBeNull();
  });

  it("caps a long range and a long line", () => {
    const tall = Array.from({ length: 200 }, (_, i) => `row ${i + 1}`).join("\n");
    expect(codeWindow(tall, at(10, 150))?.lines).toHaveLength(36);
    const wide = codeWindow("x".repeat(500), at(1));
    expect(wide?.lines[0]).toHaveLength(201);
    expect(wide?.lines[0].endsWith("…")).toBe(true);
  });

  it("reads a file with Windows line endings", () => {
    expect(codeWindow("a\r\nb\r\nc", at(2))?.lines).toEqual(["a", "b", "c"]);
  });
});

describe("renderCode", () => {
  it("numbers the lines and marks the investigated one", () => {
    expect(renderCode({ startLine: 9, lines: ["a", "b", "c"] }, at(10)).split("\n")).toEqual([
      "The code at that location (the line under investigation is marked with >):",
      "   9 | a",
      "> 10 | b",
      "  11 | c",
    ]);
  });

  it("marks every line of a range", () => {
    const text = renderCode({ startLine: 1, lines: ["a", "b", "c"] }, at(1, 2));
    expect(text).toContain("the lines under investigation are marked");
    expect(text).toContain("> 1 | a\n> 2 | b\n  3 | c");
  });
});
