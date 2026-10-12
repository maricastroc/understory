import { describe, expect, it } from "vitest";
import { codeWindow, lineChange, renderBlock, renderCode } from "./code-context";

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

describe("lineChange — what a patch did to one line", () => {
  const REWRITE = [
    "@@ -257,7 +257,7 @@ export class Linter {",
    "                 fileNewSource = Replacement.applyFixes(oldSource, fileFixes);",
    "             }",
    "-            fs.writeFileSync(filePath, fileNewSource);",
    "+            fs.writeFileSync(path.resolve(filePath), fileNewSource);",
    "             this.updateProgram(filePath);",
  ].join("\n");

  const ADDED = [
    "@@ -790,6 +790,11 @@ function Promise(descriptor, fallback, inspect) {",
    "     }",
    "+    if (inspect === void 0) {",
    "+        inspect = function () {",
    '+            return {state: "unknown"};',
    "+        };",
    "+    }",
    "     var promise = object_create(Promise.prototype);",
  ].join("\n");

  const UNEVEN = [
    "@@ -186,8 +186,6 @@",
    "-        const Formatter = findFormatter(formatterName, formattersDirectory);",
    "-        if (Formatter !== undefined) {",
    "-            formatter = new Formatter();",
    "-        } else {",
    "+        const Formatter = findFormatter(formatterName, this.options.formattersDirectory);",
    "+        if (Formatter === undefined) {",
    "             throw new Error(`formatter not found`);",
  ].join("\n");

  it("gives the line it replaced when the patch swaps one line for another", () => {
    expect(lineChange(REWRITE, "fs.writeFileSync(path.resolve(filePath), fileNewSource);")).toEqual(
      { before: "fs.writeFileSync(filePath, fileNewSource);", added: 1 },
    );
  });

  it("says the line is new when nothing was removed where it stands", () => {
    expect(lineChange(ADDED, "    if (inspect === void 0) {")).toMatchObject({
      before: null,
      added: 5,
    });
  });

  it("pairs a line with the removed line it resembles when the counts differ", () => {
    expect(lineChange(UNEVEN, "if (Formatter === undefined) {")).toMatchObject({
      before: "if (Formatter !== undefined) {",
      added: 2,
    });
  });

  it("does not pair a line with an unrelated one that only shares its position", () => {
    const patch = [
      "@@ -1,2 +1,2 @@",
      "-import a from 'a';",
      "-import b from 'b';",
      "+const limit = 3;",
      "+export default limit;",
    ].join("\n");
    expect(lineChange(patch, "export default limit;")).toMatchObject({ before: null, added: 2 });
  });

  it("recognises a line whose spacing alone changed", () => {
    const patch = ["@@ -4,1 +4,1 @@", "-  return total;", "+    return total;"].join("\n");
    expect(lineChange(patch, "    return total;")).toEqual({ before: "return total;", added: 1 });
  });

  it("says nothing when the line is not in the patch or is there more than once", () => {
    expect(lineChange(REWRITE, "this.updateProgram(filePath);")).toBeNull();
    const twice = ["@@ -1,0 +1,4 @@", "+if (a) {", "+  return i;", "+}", "+  return i;"].join("\n");
    expect(lineChange(twice, "return i;")).toBeNull();
    expect(lineChange(REWRITE, "   ")).toBeNull();
    expect(lineChange("", "anything")).toBeNull();
  });

  it("does not take the file header of a patch for an added line", () => {
    const patch = ["--- a/x.md", "+++ b/x.md", "@@ -1,0 +1,1 @@", "+b/x.md"].join("\n");
    expect(lineChange(patch, "b/x.md")).toEqual({ before: null, added: 1 });
  });

  it("finds a line the window had to cut short", () => {
    const long = `const text = "${"x".repeat(300)}";`;
    const patch = ["@@ -1,0 +1,1 @@", `+${long}`].join("\n");
    expect(lineChange(patch, `${long.slice(0, 200)}…`)).toEqual({ before: null, added: 1 });
  });
});

describe("lineChange — the part of the patch the line sits in", () => {
  const doc = (count: number) =>
    Array.from({ length: count }, (_, i) => `+   * line ${i + 1} of the comment`);
  const patch = (count: number, marked: number) =>
    [
      "@@ -10,2 +10,60 @@",
      "   unchanged();",
      ...doc(count).map((row, i) => (i === marked ? "+   * @example" : row)),
      "   unchanged();",
    ].join("\n");

  it("keeps a short block whole, and says which row is the line", () => {
    const change = lineChange(patch(6, 3), "* @example");
    expect(change?.block).toEqual({
      rows: [
        "+   * line 1 of the comment",
        "+   * line 2 of the comment",
        "+   * line 3 of the comment",
        "+   * @example",
        "+   * line 5 of the comment",
        "+   * line 6 of the comment",
      ],
      at: 3,
    });
  });

  it("stops at the unchanged lines around the block", () => {
    const rows = lineChange(patch(6, 3), "* @example")?.block?.rows ?? [];
    expect(rows.some((row) => row.includes("unchanged"))).toBe(false);
  });

  it("keeps the removed lines of a rewrite beside the added ones", () => {
    const rewrite = [
      "@@ -3,3 +3,2 @@",
      "-  if (found !== undefined) {",
      "-    use(found);",
      "-  } else {",
      "+  const found = find(name);",
      "+  if (found === undefined) {",
      "     fail();",
    ].join("\n");
    expect(lineChange(rewrite, "if (found === undefined) {")?.block).toEqual({
      rows: [
        "-  if (found !== undefined) {",
        "-    use(found);",
        "-  } else {",
        "+  const found = find(name);",
        "+  if (found === undefined) {",
      ],
      at: 4,
    });
  });

  it("keeps nothing when the change is the line alone or one line swapped for another", () => {
    const swap = ["@@ -4,1 +4,1 @@", "-  write(file, text);", "+  write(resolve(file), text);"];
    expect(lineChange(swap.join("\n"), "write(resolve(file), text);")).toEqual({
      before: "write(file, text);",
      added: 1,
    });
    expect(lineChange("@@ -1,0 +1,1 @@\n+const limit = 3;", "const limit = 3;")).toEqual({
      before: null,
      added: 1,
    });
  });

  it("caps a long block to its head and the rows around the line, and says what it left out", () => {
    const block = lineChange(patch(90, 60), "* @example")?.block;
    expect(block?.rows.length).toBeLessThanOrEqual(43);
    expect(block?.rows.slice(0, 10)).toEqual(doc(10));
    expect(block?.rows[10]).toBe("… 35 more changed lines …");
    expect(block?.rows[block.at]).toBe("+   * @example");
    expect(block?.rows.at(-1)).toBe("… 14 more changed lines …");
    expect(block?.rows).toContain("+   * line 46 of the comment");
    expect(block?.rows).toContain("+   * line 76 of the comment");
  });

  it("keeps the line in view when it is near either end of a long block", () => {
    const first = lineChange(patch(90, 2), "* @example")?.block;
    expect(first?.rows[first.at]).toBe("+   * @example");
    expect(first?.at).toBe(2);
    const last = lineChange(patch(90, 88), "* @example")?.block;
    expect(last?.rows[last.at]).toBe("+   * @example");
    expect(last?.rows.at(-1)).toBe("+   * line 90 of the comment");
    expect(last?.rows.length).toBeLessThanOrEqual(43);
  });

  it("cuts a very long row", () => {
    const long = `+const text = "${"x".repeat(300)}";`;
    const rows = lineChange(["@@ -1,0 +1,3 @@", "+a();", long, "+b();"].join("\n"), "a();")?.block
      ?.rows;
    expect(rows?.[1]).toHaveLength(161);
    expect(rows?.[1].endsWith("…")).toBe(true);
  });

  it("renders the block with the line flagged, and nothing when there is no block", () => {
    const change = lineChange(patch(6, 3), "* @example");
    expect(renderBlock({ artifactId: "commit:1e90d03", ...change! })).toEqual([
      "The part of [commit:1e90d03]'s patch the marked line sits in (+ added, - removed, the marked line flagged with >):",
      "  +   * line 1 of the comment",
      "  +   * line 2 of the comment",
      "  +   * line 3 of the comment",
      "> +   * @example",
      "  +   * line 5 of the comment",
      "  +   * line 6 of the comment",
    ]);
    expect(renderBlock({ artifactId: "commit:1e90d03", before: null, added: 1 })).toEqual([]);
  });
});

describe("renderCode — what the last change did to the line", () => {
  const code = { startLine: 9, lines: ["a", "if (found === undefined) {", "c"] };

  it("says the change added the line, and how many came with it", () => {
    const alone = renderCode(
      { ...code, change: { artifactId: "commit:a1", before: null, added: 1 } },
      at(10),
    );
    expect(alone.split("\n").at(-1)).toBe(
      "What the last change did to the marked line: [commit:a1] added it.",
    );
    const many = renderCode(
      { ...code, change: { artifactId: "commit:a1", before: null, added: 13 } },
      at(10),
    );
    expect(many).toContain("[commit:a1] added it, together with 12 other new lines around it.");
    const two = renderCode(
      { ...code, change: { artifactId: "commit:a1", before: null, added: 2 } },
      at(10),
    );
    expect(two).toContain("together with 1 other new line around it.");
  });

  it("shows what the line read before a rewrite", () => {
    const text = renderCode(
      {
        ...code,
        change: { artifactId: "commit:a1", before: "if (found !== undefined) {", added: 2 },
      },
      at(10),
    );
    expect(text.split("\n").slice(-2)).toEqual([
      "What the last change did to the marked line: [commit:a1] rewrote it. Before, it read:",
      "    if (found !== undefined) {",
    ]);
  });

  it("says so when only the spacing changed", () => {
    const text = renderCode(
      {
        ...code,
        change: { artifactId: "commit:a1", before: "if (found === undefined) {", added: 1 },
      },
      at(10),
    );
    expect(text).toContain("[commit:a1] changed only its spacing.");
  });

  it("leaves it out for a range of lines", () => {
    const text = renderCode(
      { ...code, change: { artifactId: "commit:a1", before: null, added: 3 } },
      at(9, 10),
    );
    expect(text).not.toContain("What the last change did");
  });
});
