import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveRepoInput } from "./resolve";

describe("resolveRepoInput — local paths (no network)", () => {
  it("rejects an empty input", async () => {
    await expect(resolveRepoInput("  ")).rejects.toThrow(/No repository given/);
  });

  it("returns an absolute local path as-is", async () => {
    expect(await resolveRepoInput("/tmp/some-repo")).toEqual({
      path: "/tmp/some-repo",
      kind: "local",
    });
  });

  it("resolves a dot-relative path against the cwd", async () => {
    const r = await resolveRepoInput(".demo/payments-service");
    expect(r.kind).toBe("local");
    expect(r.path).toBe(path.resolve(process.cwd(), ".demo/payments-service"));
  });

  it("treats a bare name (no owner/repo slash) as a local path, not a clone", async () => {
    const r = await resolveRepoInput("some-folder");
    expect(r.kind).toBe("local");
  });
});
