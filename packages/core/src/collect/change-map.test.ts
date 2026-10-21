import { describe, expect, it } from "vitest";
import {
  type ChangedFile,
  GAP,
  LINE_MARK,
  changeMap,
  filesOfPatch,
  hunksOf,
  renderChangeMap,
} from "./change-map";

const hunk = (at: number, rows: string[], section = "") => {
  const before = rows.filter((r) => !r.startsWith("+")).length;
  const after = rows.filter((r) => !r.startsWith("-")).length;
  return [`@@ -${at},${before} +${at},${after} @@${section ? ` ${section}` : ""}`, ...rows].join(
    "\n",
  );
};

const file = (path: string, ...hunks: string[]): ChangedFile => {
  const rows = hunks.join("\n").split("\n");
  return {
    path,
    status: "modified",
    added: rows.filter((r) => r.startsWith("+")).length,
    removed: rows.filter((r) => r.startsWith("-")).length,
    patch: hunks.join("\n"),
  };
};

const context = (n: number) => Array.from({ length: n }, (_, i) => ` keep(${i});`);

const LINTER = file(
  "src/linter.ts",
  hunk(
    20,
    [" import a;", "-import { old } from './rules';", "+import { fresh } from './rules';"],
    "imports",
  ),
  hunk(
    140,
    [
      "     public getResult(): LintResult {",
      "-        if (Formatter !== undefined) {",
      "+        if (Formatter === undefined) {",
      "             throw new Error('not found');",
      ...context(20),
      "+        return removeDisabledFailures(sourceFile, failures);",
      "-        return this.filterAll(failures);",
    ],
    "class Linter",
  ),
  hunk(300, ["-        cache.clear();", "+        cache.reset();"], "dispose"),
);
const LOADER = file(
  "src/formatterLoader.ts",
  hunk(
    52,
    [
      "-function loadFormatter(...paths: string[]) {",
      "+function loadFormatter(directory: string, name: string, isCore?: boolean) {",
      "+        fullPath = require.resolve(formatterPath);",
    ],
    "allow uncompiled formatters",
  ),
);
const AT = { path: "src/linter.ts", text: "if (Formatter === undefined) {" };

describe("hunksOf", () => {
  it("splits a patch into hunks, with the section after the header and no trailing blank row", () => {
    expect(hunksOf(`${hunk(1, ["-a", "+b"], "fn()")}\n`)).toEqual([
      { header: "@@ -1,1 +1,1 @@", section: "fn()", rows: ["-a", "+b"] },
    ]);
  });
});

describe("changeMap — the whole change, with the investigated line in place", () => {
  it("names every file and every hunk, the line's file first, and knows the line's number", () => {
    const map = changeMap([LOADER, LINTER], AT);
    expect(map.complete).toBe(true);
    expect(map.line).toEqual({ path: "src/linter.ts", found: true, number: 141 });
    expect(map.files.map((f) => [f.path, f.hunks.map((h) => [h.section, h.line])])).toEqual([
      [
        "src/linter.ts",
        [
          ["imports", false],
          ["class Linter", true],
          ["dispose", false],
        ],
      ],
      ["src/formatterLoader.ts", [["allow uncompiled formatters", false]]],
    ]);
  });

  it("numbers each row and marks the investigated line, with the rows around it", () => {
    const [, line] = changeMap([LINTER], AT).files[0].hunks;
    expect(line.rows.slice(0, 4)).toEqual([
      "   140     public getResult(): LintResult {",
      "-  141         if (Formatter !== undefined) {",
      `+  141         if (Formatter === undefined) {  ${LINE_MARK}`,
      "   142             throw new Error('not found');",
    ]);
  });

  it("keeps a changed row far down the line's own hunk, apart from the line by a gap", () => {
    const [, line] = changeMap([LINTER], AT).files[0].hunks;
    expect(line.rows).toContain(GAP);
    expect(line.rows.slice(-2)).toEqual([
      "+  163         return removeDisabledFailures(sourceFile, failures);",
      "-  163         return this.filterAll(failures);",
    ]);
  });

  it("shows only the changed rows of the other hunks", () => {
    const [imports] = changeMap([LINTER], AT).files[0].hunks;
    expect(imports.rows).toEqual([
      "-   21 import { old } from './rules';",
      "+   21 import { fresh } from './rules';",
    ]);
  });

  it("says when it cannot find the line, rather than marking a guess", () => {
    const map = changeMap([LINTER], { path: "src/linter.ts", text: "nowhere();" });
    expect(map.line).toEqual({ path: "src/linter.ts", found: false, number: null });
    expect(map.files[0].hunks.some((h) => h.line)).toBe(false);
  });

  it("finds the line in another file when its path changed, as after a rename", () => {
    expect(changeMap([LOADER, LINTER], { path: "src/old.ts", text: AT.text }).line).toMatchObject({
      path: "src/linter.ts",
      found: true,
    });
  });

  it("shows a file whose patch the host did not return, and says so", () => {
    const map = changeMap([LINTER, { ...LOADER, patch: null }], AT);
    expect(map.files[1]).toMatchObject({ patch: "not returned", hunks: [] });
    expect(renderChangeMap(map)).toContain(
      "src/formatterLoader.ts · modified · +2 −1 · patch not returned",
    );
  });
});

describe("changeMap — within a budget", () => {
  const many = Array.from({ length: 30 }, (_, i) =>
    file(
      `src/f${i}.ts`,
      hunk(
        1,
        Array.from({ length: 20 }, (_, r) => `+row ${r} of file ${i}`),
      ),
    ),
  );

  it("keeps the line and the rows around it before anything else", () => {
    const map = changeMap([LINTER, ...many], AT, 600);
    const line = map.files[0].hunks.find((h) => h.line)!;
    expect(line.rows.find((r) => r.endsWith(LINE_MARK))).toBeDefined();
    expect(map.complete).toBe(false);
  });

  it("spreads the rows it can afford across the hunks, so no file takes the whole budget", () => {
    const map = changeMap([LINTER, ...many], AT, 6_000);
    const shown = map.files.slice(1).map((f) => f.hunks[0]?.rows.length ?? 0);
    expect(Math.max(...shown) - Math.min(...shown)).toBeLessThanOrEqual(1);
    expect(map.cut.rows).toBeGreaterThan(0);
  });

  it("counts apart what it leaves out of the line's own hunk", () => {
    const map = changeMap([LINTER, ...many], AT, 1_500);
    const line = map.files[0].hunks.find((h) => h.line)!;
    expect(map.cut.lineHunkRows).toBe(line.cut);
    expect(line.cut).toBeGreaterThan(0);
  });

  it("counts what it leaves out, says so where it leaves it, and reports its own size", () => {
    const map = changeMap([LINTER, ...many], AT, 2_500);
    const text = renderChangeMap(map);
    expect(map.cut.files + map.cut.hunks + map.cut.rows).toBeGreaterThan(0);
    expect(text).toMatch(/… \d+ more (changed rows?|hunks?|files?) not shown/);
    expect(map.chars).toBe(text.length);
  });

  it("cuts a long row and counts it", () => {
    const long = file("src/long.ts", hunk(1, [`+${"x".repeat(400)}`]));
    const map = changeMap([LINTER, long], AT);
    expect(map.files[1].hunks[0].rows[0]).toHaveLength(167);
    expect(map.cut.clipped).toBe(1);
  });
});

describe("filesOfPatch — a commit's patch from git, file by file", () => {
  it("reads each file, its status, its counts and a rename", () => {
    const patch = [
      "diff --git a/src/a.ts b/src/a.ts",
      "index 1..2 100644",
      "--- a/src/a.ts",
      "+++ b/src/a.ts",
      hunk(1, ["-old", "+new"]),
      "diff --git a/src/b.ts b/src/c.ts",
      "similarity index 90%",
      "rename from src/b.ts",
      "rename to src/c.ts",
      "--- a/src/b.ts",
      "+++ b/src/c.ts",
      hunk(4, ["+added"]),
      "diff --git a/src/d.ts b/src/d.ts",
      "new file mode 100644",
      "--- /dev/null",
      "+++ b/src/d.ts",
      hunk(1, ["+one", "+two"]),
      "",
    ].join("\n");
    expect(
      filesOfPatch(patch).map((f) => [
        f.path,
        f.previousPath ?? null,
        f.status,
        f.added,
        f.removed,
      ]),
    ).toEqual([
      ["src/a.ts", null, "modified", 1, 1],
      ["src/c.ts", "src/b.ts", "renamed", 1, 0],
      ["src/d.ts", null, "added", 2, 0],
    ]);
    expect(hunksOf(filesOfPatch(patch)[0].patch!)).toHaveLength(1);
  });
});
