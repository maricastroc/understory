import { describe, expect, it } from "vitest";
import { parsePr } from "./parse-pr";

describe("parsePr", () => {
  it("parses a full GitHub PR url", () => {
    expect(parsePr("https://github.com/chalk/chalk/pull/664")).toEqual({
      owner: "chalk",
      repo: "chalk",
      number: 664,
    });
  });

  it("ignores trailing path and query", () => {
    expect(parsePr("https://github.com/styled-components/styled-components/pull/4124/files?w=1")).toEqual({
      owner: "styled-components",
      repo: "styled-components",
      number: 4124,
    });
  });

  it("parses the short owner/repo#N form", () => {
    expect(parsePr("chalk/chalk#664")).toEqual({ owner: "chalk", repo: "chalk", number: 664 });
  });

  it("strips a trailing .git", () => {
    expect(parsePr("acme/pay.git#7")).toMatchObject({ repo: "pay", number: 7 });
  });

  it("returns null for anything that isn't a PR reference", () => {
    expect(parsePr("chalk/chalk")).toBeNull();
    expect(parsePr("https://github.com/chalk/chalk")).toBeNull();
    expect(parsePr("just some text")).toBeNull();
    expect(parsePr("")).toBeNull();
  });
});
