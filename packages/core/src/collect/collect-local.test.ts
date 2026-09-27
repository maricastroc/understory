import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { blameWindow } from "./blame-window";
import { lineHistory, readFileAtRef } from "./git";
import { collect } from "./index";

let dir = "";
let first = "";
let second = "";

function git(args: string[], date?: string) {
  return execFileSync("git", ["-C", dir, ...args], {
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "Ana",
      GIT_AUTHOR_EMAIL: "ana@example.com",
      GIT_COMMITTER_NAME: "Ana",
      GIT_COMMITTER_EMAIL: "ana@example.com",
      ...(date ? { GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date } : {}),
    },
  })
    .toString()
    .trim();
}

beforeAll(() => {
  dir = mkdtempSync(path.join(tmpdir(), "gi-local-"));
  git(["init", "-q"]);
  writeFileSync(path.join(dir, "charge.ts"), "a\nwhile (true) {\nc\n");
  git(["add", "-A"]);
  git(["commit", "-q", "-m", "add retry loop"], "2021-06-18T00:00:00Z");
  first = git(["rev-parse", "HEAD"]);
  writeFileSync(path.join(dir, "charge.ts"), "a\nfor (let i = 0; i < 3; i++) {\nc\nd\n");
  git(["commit", "-q", "-am", "cap retries at 3"], "2023-03-15T00:00:00Z");
  second = git(["rev-parse", "HEAD"]);
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("collect — local checkout", () => {
  it("pins the evidence to HEAD and marks PR lookup as skipped without a remote", async () => {
    const ev = await collect({
      repoPath: dir,
      question: "why 3?",
      location: { file: "charge.ts", startLine: 2, endLine: 2 },
    });
    expect(ev.repo.sha).toBe(second);
    expect(ev.artifacts.map((a) => a.title)).toEqual(["add retry loop", "cap retries at 3"]);
    expect(ev.artifacts.every((a) => a.meta?.prLookup === "skipped")).toBe(true);
  });

  it("reads line history at a pinned revision, not at the current HEAD", async () => {
    const history = await lineHistory(dir, { file: "charge.ts", startLine: 2, endLine: 2 }, first);
    expect(history.map((c) => c.sha)).toEqual([first]);
  });

  it("rejects a revision that is not a commit sha", async () => {
    await expect(
      lineHistory(dir, { file: "charge.ts", startLine: 2, endLine: 2 }, "--all"),
    ).rejects.toThrow(/Not a commit sha/);
  });
});

describe("readFileAtRef", () => {
  it("returns the file as it was at the investigated commit", async () => {
    expect(await readFileAtRef(dir, first, "charge.ts")).toBe("a\nwhile (true) {\nc\n");
    expect(await readFileAtRef(dir, second, "charge.ts")).toContain("i < 3");
  });

  it("refuses anything that is not a sha", async () => {
    await expect(readFileAtRef(dir, "HEAD~1", "charge.ts")).rejects.toThrow(/Not a commit sha/);
  });
});

describe("blameWindow — local", () => {
  it("attributes each line of the window to the commit that last changed it", async () => {
    const spans = await blameWindow({
      repoPath: dir,
      file: "charge.ts",
      ref: second,
      start: 1,
      end: 4,
    });
    expect(spans.map((s) => [s.startLine, s.endLine, s.sha])).toEqual([
      [1, 1, first],
      [2, 2, second],
      [3, 3, first],
      [4, 4, second],
    ]);
    expect(spans[1].date).toBe("2023-03-15T00:00:00.000Z");
    expect(spans[1].author).toBe("Ana");
  });

  it("blames the pinned revision even after the file moved on", async () => {
    const spans = await blameWindow({
      repoPath: dir,
      file: "charge.ts",
      ref: first,
      start: 1,
      end: 3,
    });
    expect(spans.every((s) => s.sha === first)).toBe(true);
  });

  it("validates the ref and the window before touching git", async () => {
    await expect(
      blameWindow({ repoPath: dir, file: "charge.ts", ref: "main", start: 1, end: 2 }),
    ).rejects.toThrow(/Not a commit sha/);
    await expect(
      blameWindow({ repoPath: dir, file: "charge.ts", ref: second, start: 3, end: 2 }),
    ).rejects.toThrow(/Bad line window/);
    await expect(
      blameWindow({ repoPath: dir, file: "charge.ts", ref: second, start: 1, end: 401 }),
    ).rejects.toThrow(/limited to 400/);
  });
});
