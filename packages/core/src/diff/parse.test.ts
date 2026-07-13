import { describe, expect, it } from "vitest";
import { coalesce, parseUnifiedDiff } from "./parse";

describe("coalesce", () => {
  it("collapses contiguous line numbers into ranges", () => {
    expect(coalesce([3, 4, 5, 9, 10, 20])).toEqual([
      { start: 3, end: 5 },
      { start: 9, end: 10 },
      { start: 20, end: 20 },
    ]);
  });
  it("sorts and dedupes first", () => {
    expect(coalesce([5, 3, 4, 4])).toEqual([{ start: 3, end: 5 }]);
  });
  it("is empty for no input", () => {
    expect(coalesce([])).toEqual([]);
  });
});

describe("parseUnifiedDiff — a modified file", () => {
  const diff = `diff --git a/src/a.ts b/src/a.ts
index 1111111..2222222 100644
--- a/src/a.ts
+++ b/src/a.ts
@@ -5,4 +5,4 @@ export function f() {
 const a = 1;
-  const cap = 3;
+  const cap = 5;
 return a;`;

  it("extracts the removed old-side line with the right number", () => {
    const { files } = parseUnifiedDiff(diff);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatchObject({
      oldPath: "src/a.ts",
      newPath: "src/a.ts",
      status: "modified",
      binary: false,
      removedRanges: [{ start: 6, end: 6 }],
      addedRanges: [{ start: 6, end: 6 }],
    });
  });
});

describe("parseUnifiedDiff — line numbering across hunks", () => {
  it("tracks separate hunks with correct old-line numbers", () => {
    const diff = `diff --git a/m.ts b/m.ts
--- a/m.ts
+++ b/m.ts
@@ -2,2 +2,2 @@
 a
-b
+B
@@ -10,2 +10,2 @@
 x
-y
+Y`;
    const { files } = parseUnifiedDiff(diff);
    expect(files[0].removedRanges).toEqual([
      { start: 3, end: 3 },
      { start: 11, end: 11 },
    ]);
  });

  it("handles a hunk header with omitted counts (single line)", () => {
    const diff = `diff --git a/s.ts b/s.ts
--- a/s.ts
+++ b/s.ts
@@ -5 +5 @@
-only
+ONLY`;
    expect(parseUnifiedDiff(diff).files[0].removedRanges).toEqual([{ start: 5, end: 5 }]);
  });

  it("ignores '\\ No newline at end of file' markers", () => {
    const diff = `diff --git a/n.ts b/n.ts
--- a/n.ts
+++ b/n.ts
@@ -1,1 +1,1 @@
-a
\\ No newline at end of file
+a
\\ No newline at end of file`;
    expect(parseUnifiedDiff(diff).files[0].removedRanges).toEqual([{ start: 1, end: 1 }]);
  });
});

describe("parseUnifiedDiff — file lifecycle", () => {
  it("marks an added file (no old-side history)", () => {
    const diff = `diff --git a/new.txt b/new.txt
new file mode 100644
index 0000000..4444444
--- /dev/null
+++ b/new.txt
@@ -0,0 +1,2 @@
+hello
+world`;
    expect(parseUnifiedDiff(diff).files[0]).toMatchObject({
      status: "added",
      oldPath: null,
      newPath: "new.txt",
      removedRanges: [],
      addedRanges: [{ start: 1, end: 2 }],
    });
  });

  it("marks a deleted file with all old lines removed", () => {
    const diff = `diff --git a/old.txt b/old.txt
deleted file mode 100644
index 3333333..0000000
--- a/old.txt
+++ /dev/null
@@ -1,3 +0,0 @@
-line one
-line two
-line three`;
    expect(parseUnifiedDiff(diff).files[0]).toMatchObject({
      status: "deleted",
      oldPath: "old.txt",
      newPath: null,
      removedRanges: [{ start: 1, end: 3 }],
    });
  });

  it("marks a rename with edits", () => {
    const diff = `diff --git a/old/name.ts b/new/name.ts
similarity index 95%
rename from old/name.ts
rename to new/name.ts
index 5555555..6666666 100644
--- a/old/name.ts
+++ b/new/name.ts
@@ -10,3 +10,3 @@
 keep
-old
+new
 keep`;
    expect(parseUnifiedDiff(diff).files[0]).toMatchObject({
      status: "renamed",
      oldPath: "old/name.ts",
      newPath: "new/name.ts",
      removedRanges: [{ start: 11, end: 11 }],
    });
  });

  it("flags a binary file with no ranges", () => {
    const diff = `diff --git a/img.png b/img.png
index 7777777..8888888 100644
Binary files a/img.png and b/img.png differ`;
    expect(parseUnifiedDiff(diff).files[0]).toMatchObject({
      binary: true,
      oldPath: "img.png",
      removedRanges: [],
      addedRanges: [],
    });
  });
});

describe("parseUnifiedDiff — tricky content", () => {
  it("does not mistake a removed line starting with '--' for a file header", () => {
    const diff = `diff --git a/a.md b/a.md
index 1..2 100644
--- a/a.md
+++ b/a.md
@@ -1,3 +1,3 @@
 title
--- old subtitle
+## new subtitle
 body`;
    const f = parseUnifiedDiff(diff).files[0];
    expect(f.oldPath).toBe("a.md"); // NOT "old subtitle"
    expect(f.status).toBe("modified");
    expect(f.removedRanges).toEqual([{ start: 2, end: 2 }]);
  });

  it("parses multiple files in one diff", () => {
    const diff = `diff --git a/one.ts b/one.ts
--- a/one.ts
+++ b/one.ts
@@ -1 +1 @@
-a
+A
diff --git a/two.ts b/two.ts
--- a/two.ts
+++ b/two.ts
@@ -3 +3 @@
-b
+B`;
    const { files } = parseUnifiedDiff(diff);
    expect(files.map((f) => f.oldPath)).toEqual(["one.ts", "two.ts"]);
    expect(files[1].removedRanges).toEqual([{ start: 3, end: 3 }]);
  });

  it("returns no files for an empty diff", () => {
    expect(parseUnifiedDiff("")).toEqual({ files: [] });
    expect(parseUnifiedDiff("\n\n")).toEqual({ files: [] });
  });
});
