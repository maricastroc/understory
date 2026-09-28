import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseGitLabRepo } from "./repo";

describe("parseGitLabRepo", () => {
  const prev = process.env.GITLAB_HOSTS;

  beforeEach(() => {
    process.env.GITLAB_HOSTS = "gitlab.company.com";
  });
  afterEach(() => {
    if (prev === undefined) delete process.env.GITLAB_HOSTS;
    else process.env.GITLAB_HOSTS = prev;
  });

  it("parses a self-hosted GitLab project URL", () => {
    expect(parseGitLabRepo("https://gitlab.company.com/team/payments")).toEqual({
      host: "gitlab.company.com",
      project: "team/payments",
    });
  });

  it("parses nested subgroups", () => {
    expect(parseGitLabRepo("https://gitlab.company.com/org/team/payments")).toEqual({
      host: "gitlab.company.com",
      project: "org/team/payments",
    });
  });

  it("strips a /-/ file path suffix and .git", () => {
    expect(
      parseGitLabRepo("https://gitlab.company.com/team/payments/-/blob/main/src/x.ts"),
    ).toEqual({ host: "gitlab.company.com", project: "team/payments" });
    expect(parseGitLabRepo("https://gitlab.company.com/team/payments.git")).toEqual({
      host: "gitlab.company.com",
      project: "team/payments",
    });
  });

  it("parses an ssh remote", () => {
    expect(parseGitLabRepo("git@gitlab.company.com:team/payments.git")).toEqual({
      host: "gitlab.company.com",
      project: "team/payments",
    });
  });

  it("recognizes gitlab.com by default", () => {
    expect(parseGitLabRepo("https://gitlab.com/inkscape/inkscape")).toEqual({
      host: "gitlab.com",
      project: "inkscape/inkscape",
    });
  });

  it("ignores hosts not in the allow-list", () => {
    expect(parseGitLabRepo("https://github.com/facebook/react")).toBeNull();
    expect(parseGitLabRepo("https://gitlab.other.com/a/b")).toBeNull();
  });

  it("rejects shorthand and group-only URLs", () => {
    expect(parseGitLabRepo("team/payments")).toBeNull();
    expect(parseGitLabRepo("https://gitlab.company.com/team")).toBeNull();
  });
});
