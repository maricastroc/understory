import { describe, expect, it } from "vitest";
import { parseBlamePorcelain } from "./blame-porcelain";

const ONE = "2ec88c790e425245d2fbed185b8a2d11f9e3b8d9";
const TWO = "4608c730c3831e741635b977fe2cc565fe7c31b5";

const SAMPLE = [
  `${ONE} 1 1 1`,
  "author Ana",
  "author-mail <a@x>",
  "author-time 1790519279",
  "author-tz -0300",
  "committer Ana",
  "committer-mail <a@x>",
  "committer-time 1672531200",
  "committer-tz +0000",
  "summary one",
  "boundary",
  "filename f.txt",
  "\ta",
  `${TWO} 2 2 2`,
  "author Bo",
  "author-mail <b@x>",
  "author-time 1790519279",
  "author-tz -0300",
  "committer Bo",
  "committer-mail <b@x>",
  "committer-time 1704067200",
  "committer-tz +0000",
  "summary two",
  `previous ${ONE} f.txt`,
  "filename f.txt",
  "\tB",
  `${TWO} 3 3`,
  "\tC",
  `${ONE} 3 4 1`,
  "\tc",
  "",
].join("\n");

describe("parseBlamePorcelain", () => {
  it("groups consecutive lines of the same commit into spans", () => {
    expect(parseBlamePorcelain(SAMPLE)).toEqual([
      {
        startLine: 1,
        endLine: 1,
        sha: ONE,
        shortSha: ONE.slice(0, 7),
        date: "2023-01-01T00:00:00.000Z",
        author: "Ana",
      },
      {
        startLine: 2,
        endLine: 3,
        sha: TWO,
        shortSha: TWO.slice(0, 7),
        date: "2024-01-01T00:00:00.000Z",
        author: "Bo",
      },
      {
        startLine: 4,
        endLine: 4,
        sha: ONE,
        shortSha: ONE.slice(0, 7),
        date: "2023-01-01T00:00:00.000Z",
        author: "Ana",
      },
    ]);
  });

  it("uses the committer date, matching the GitHub adapter's committedDate", () => {
    const [first] = parseBlamePorcelain(SAMPLE);
    expect(first.date).toBe(new Date(1672531200 * 1000).toISOString());
  });

  it("drops uncommitted lines instead of attributing them to a commit", () => {
    const text = [
      `${"0".repeat(40)} 1 1 1`,
      "author Not Committed Yet",
      "committer-time 1790519279",
      "filename f.txt",
      "\tdirty",
    ].join("\n");
    expect(parseBlamePorcelain(text)).toEqual([]);
  });

  it("returns nothing for empty output", () => {
    expect(parseBlamePorcelain("")).toEqual([]);
  });
});
