import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { lineBefore } from "./code-context";
import { collect } from "./index";
import {
  type CommitAt,
  type LineageProvider,
  LINEAGE_LIMITS,
  lineageOf,
  localLineage,
  walkLineage,
} from "./lineage";

const swap = (from: string, to: string) => `@@ -2,1 +2,1 @@\n-${from}\n+${to}`;
const commit = (over: Partial<CommitAt>): CommitAt => ({
  date: "2024-01-01T00:00:00Z",
  title: "a change",
  message: "a change\n\nwith a body",
  parent: null,
  patch: null,
  ...over,
});

function history(commits: Record<string, CommitAt>, owners: Record<string, string | null>) {
  const calls: string[] = [];
  const provider: LineageProvider = {
    async commit(sha, file) {
      calls.push(`commit ${sha} ${file}`);
      if (!commits[sha]) throw new Error("gone");
      return commits[sha];
    },
    async owner(ref, file, line) {
      calls.push(`owner ${ref} ${file} ${line}`);
      return owners[`${ref}:${line}`] ?? null;
    },
  };
  return { provider, calls };
}

const THREE = {
  c3: commit({ parent: "p3", patch: swap("const cap = 5;", "const cap = 3;"), title: "cap at 3" }),
  c2: commit({ parent: "p2", patch: swap("const cap = 9;", "const cap = 5;"), title: "cap at 5" }),
  c1: commit({ patch: "@@ -0,0 +1,2 @@\n+a();\n+const cap = 9;", title: "add the cap" }),
};
const OWNERS = { "p3:2": "c2", "p2:2": "c1" };
const START = { sha: "c3", path: "cap.ts", text: "const cap = 3;" };

describe("walkLineage — back through the changes to one line", () => {
  it("stops by itself where the line was added, and says what each change did", async () => {
    const { provider, calls } = history(THREE, OWNERS);
    const lineage = await walkLineage(START, provider);
    expect(lineage.stopped).toBe("the line was added");
    expect(lineage.entries.map((e) => [e.sha, e.did, e.before])).toEqual([
      ["c3", "rewrote", "const cap = 5;"],
      ["c2", "rewrote", "const cap = 9;"],
      ["c1", "added", null],
    ]);
    expect(lineage.entries[0]).toMatchObject({
      title: "cap at 3",
      message: "a change\n\nwith a body",
    });
    expect(calls).toHaveLength(5);
  });

  it("goes no further back than the number of earlier changes allowed", async () => {
    const { provider } = history(THREE, OWNERS);
    const lineage = await walkLineage(START, provider, { ...LINEAGE_LIMITS, earlier: 1 });
    expect(lineage.entries.map((e) => e.sha)).toEqual(["c3", "c2"]);
    expect(lineage.stopped).toBe("depth limit");
  });

  it("never makes more requests than allowed, however long the history", async () => {
    const long: Record<string, CommitAt> = {};
    const owners: Record<string, string> = {};
    for (let i = 20; i > 0; i--) {
      long[`c${i}`] = commit({ parent: `p${i}`, patch: swap(`v${i - 1};`, `v${i};`) });
      owners[`p${i}:2`] = `c${i - 1}`;
    }
    const { provider, calls } = history(long, owners);
    const lineage = await walkLineage({ sha: "c20", path: "a.ts", text: "v20;" }, provider, {
      earlier: 50,
      requests: 6,
      ms: 4_000,
    });
    expect(calls.length).toBeLessThanOrEqual(6);
    expect(lineage.stopped).toBe("request limit");
    expect(lineage.entries.at(-1)?.did).toBe("rewrote");
  });

  it("stops at its time limit and when it is cancelled, keeping what it has", async () => {
    const clock = [0, 0, 0, 5_000, 5_000, 5_000];
    const slow = await walkLineage(
      START,
      history(THREE, OWNERS).provider,
      LINEAGE_LIMITS,
      undefined,
      () => (clock.length > 1 ? clock.shift()! : clock[0]),
    );
    expect(slow.stopped).toBe("time limit");
    expect(slow.entries.map((e) => e.sha)).toEqual(["c3"]);

    const gone = new AbortController();
    gone.abort();
    const { provider, calls } = history(THREE, OWNERS);
    expect(await walkLineage(START, provider, LINEAGE_LIMITS, gone.signal)).toEqual({
      entries: [],
      stopped: "cancelled",
    });
    expect(calls).toEqual([]);
  });

  it("does not wait for a request in flight past its time limit or its cancellation", async () => {
    const stuck: LineageProvider = {
      commit: () => new Promise<CommitAt>(() => {}),
      owner: async () => null,
    };
    const began = Date.now();
    const late = await walkLineage(START, stuck, { ...LINEAGE_LIMITS, ms: 40 });
    expect(late).toEqual({ entries: [], stopped: "time limit" });
    expect(Date.now() - began).toBeLessThan(1_000);

    const gone = new AbortController();
    const hanging: LineageProvider = {
      commit: async () => THREE.c3,
      owner: () => new Promise<string | null>(() => {}),
    };
    const walking = walkLineage(START, hanging, LINEAGE_LIMITS, gone.signal);
    setTimeout(() => gone.abort(), 20);
    const cut = await walking;
    expect(cut.stopped).toBe("cancelled");
    expect(cut.entries.map((e) => e.sha)).toEqual(["c3"]);
  });

  it("says so when the patch is missing, the commit cannot be read or the line cannot be followed", async () => {
    const noPatch = history({ c3: commit({ parent: "p3" }) }, {});
    expect((await walkLineage(START, noPatch.provider)).stopped).toBe("no patch");
    expect((await walkLineage({ ...START, sha: "zz" }, noPatch.provider)).stopped).toBe("no patch");
    const elsewhere = history({ c3: commit({ parent: "p3", patch: swap("x();", "y();") }) }, {});
    expect((await walkLineage(START, elsewhere.provider)).stopped).toBe("line not located");
    const lost = history({ c3: THREE.c3 }, {});
    const lineage = await walkLineage(START, lost.provider);
    expect(lineage.stopped).toBe("line not located");
    expect(lineage.entries).toHaveLength(1);
  });

  it("follows a file through a rename and cuts a long message", async () => {
    const renamed = history(
      {
        c3: commit({ ...THREE.c3, previousPath: "old.ts", message: "m".repeat(5_000) }),
        c2: commit({ patch: "@@ -0,0 +1,2 @@\n+a();\n+const cap = 5;" }),
      },
      { "p3:2": "c2" },
    );
    const lineage = await walkLineage(START, renamed.provider);
    expect(renamed.calls).toContain("owner p3 old.ts 2");
    expect(renamed.calls).toContain("commit c2 old.ts");
    expect(lineage.entries[0].message).toHaveLength(1_200);
    expect(lineage.stopped).toBe("the line was added");
  });
});

describe("lineBefore — where the line stood before a change", () => {
  it("counts from the hunk header to the removed row", () => {
    const patch = ["@@ -10,4 +10,4 @@", " keep();", "-old();", "+new();", " keep();"].join("\n");
    expect(lineBefore(patch, "old();")).toBe(11);
  });

  it("gives nothing when the removed row is not there, or is there twice", () => {
    expect(lineBefore("@@ -1,1 +1,1 @@\n-a();\n+b();", "c();")).toBeNull();
    expect(lineBefore("@@ -1,2 +1,0 @@\n-a();\n-a();", "a();")).toBeNull();
  });
});

describe("the walk on a real local repository", () => {
  let dir = "";
  const git = (args: string[], date: string) =>
    execFileSync("git", ["-C", dir, ...args], {
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: "Ana",
        GIT_AUTHOR_EMAIL: "ana@example.com",
        GIT_COMMITTER_NAME: "Ana",
        GIT_COMMITTER_EMAIL: "ana@example.com",
        GIT_AUTHOR_DATE: date,
        GIT_COMMITTER_DATE: date,
      },
    })
      .toString()
      .trim();

  beforeAll(() => {
    dir = mkdtempSync(path.join(tmpdir(), "gi-lineage-"));
    git(["init", "-q"], "2021-01-01T00:00:00Z");
    for (const [cap, day] of [
      [9, "01"],
      [5, "02"],
      [3, "03"],
    ] as const) {
      writeFileSync(path.join(dir, "cap.ts"), `a();\nconst cap = ${cap};\nb();\n`);
      git(["add", "-A"], `2021-02-${day}T00:00:00Z`);
      git(["commit", "-q", "-m", `cap at ${cap}`], `2021-02-${day}T00:00:00Z`);
    }
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("reads the three changes, newest first, down to where the line was added", async () => {
    const head = git(["rev-parse", "HEAD"], "2021-02-03T00:00:00Z");
    const lineage = await walkLineage(
      { sha: head, path: "cap.ts", text: "const cap = 3;" },
      localLineage(dir),
    );
    expect(lineage.entries.map((e) => [e.title, e.did, e.before])).toEqual([
      ["cap at 3", "rewrote", "const cap = 5;"],
      ["cap at 5", "rewrote", "const cap = 9;"],
      ["cap at 9", "added", null],
    ]);
    expect(lineage.stopped).toBe("the line was added");
  });

  it("starts from collected evidence, and gives nothing for a range of lines", async () => {
    const at = (startLine: number, endLine: number) =>
      collect({
        repoPath: dir,
        question: "why?",
        location: { file: "cap.ts", startLine, endLine },
      });
    const lineage = await lineageOf(await at(2, 2));
    expect(lineage?.entries).toHaveLength(3);
    expect(await lineageOf(await at(1, 2))).toBeNull();
  });
});
