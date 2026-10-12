import { afterEach, describe, expect, it, vi } from "vitest";
import { auditSubject } from "../entail";
import { buildSynthesisInput } from "../synthesize";
import { collect } from "./index";
import { runWithTokens } from "./token-context";

const HEAD = "f".repeat(40);
const OWNER = "c".repeat(40);
const FILE = "src%2Fsync%2Fpoll.ts";
const SOURCE = [
  "export async function poll(cursor: Cursor) {",
  "  const rows = [];",
  "  for (;;) {",
  "    const page = await fetchPage(cursor, PAGE_SIZE);",
  "    if (page.length === 0) break;",
  "    rows.push(...page);",
  "  }",
  "  return rows;",
].join("\n");

type Route = (path: string) => unknown;

function stub(route: Route) {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: unknown) => {
      const path = String(input).replace("https://gitlab.com/api/v4", "");
      calls.push(path);
      const body = route(path);
      const text = async (): Promise<string> => (typeof body === "string" ? body : "");
      if (body === undefined) return { ok: false, status: 404, json: async () => ({}), text };
      return { ok: true, status: 200, headers: { get: () => null }, json: async () => body, text };
    }),
  );
  return calls;
}

const commit = {
  id: OWNER,
  short_id: OWNER.slice(0, 8),
  title: "sync: rename the page helper",
  message: "sync: rename the page helper\n\nfetchBatch becomes fetchPage. No change in behaviour.",
  committed_date: "2024-05-02T00:00:00Z",
  web_url: `https://gitlab.com/acme/sync/-/commit/${OWNER}`,
  author_name: "Ana",
  author_email: null,
};

const RENAME = [
  "@@ -3,3 +3,3 @@",
  "   for (;;) {",
  "-    const page = await fetchBatch(cursor, PAGE_SIZE);",
  "+    const page = await fetchPage(cursor, PAGE_SIZE);",
  "     if (page.length === 0) break;",
].join("\n");

type Diff = Array<{ new_path: string; diff?: string }> | undefined;

const routes =
  (name: string, diff: Diff, size = 100, source: string | null = SOURCE): Route =>
  (path) => {
    const project = `/projects/${encodeURIComponent(name)}`;
    if (path === project)
      return {
        path_with_namespace: name,
        default_branch: "main",
        web_url: `https://gitlab.com/${name}`,
        visibility: "public",
        description: null,
        star_count: 0,
        forks_count: 0,
        last_activity_at: null,
      };
    if (path === `${project}/languages`) return {};
    if (path === `${project}/repository/branches/main`) return { commit: { id: HEAD } };
    if (path.startsWith(`${project}/repository/files/${FILE}/blame`))
      return [{ commit, lines: ["    const page = await fetchPage(cursor, PAGE_SIZE);"] }];
    if (path.startsWith(`${project}/repository/files/${FILE}/raw`)) return source ?? undefined;
    if (path.startsWith(`${project}/repository/files/${FILE}?`)) return { size };
    if (path.startsWith(`${project}/repository/commits?`)) return [commit];
    if (path === `${project}/repository/commits/${OWNER}/merge_requests`) return [];
    if (path.startsWith(`${project}/repository/commits/${OWNER}/diff`)) return diff;
    return undefined;
  };

const dig = (name: string, startLine = 4, endLine = startLine) =>
  runWithTokens({ gitlab: "t" }, () =>
    collect({
      repoPath: `https://gitlab.com/${name}`,
      question: "Why is this line the way it is?",
      location: { file: "src/sync/poll.ts", startLine, endLine },
    }),
  );

afterEach(() => vi.unstubAllGlobals());

describe("collect — GitLab shows the investigated code", () => {
  it("keeps the line with its neighbours, read at the head the blame ran on", async () => {
    const calls = stub(routes("acme/code1", [{ new_path: "src/sync/poll.ts", diff: RENAME }]));
    const ev = await dig("acme/code1");

    expect(ev.code).toMatchObject({ startLine: 1, lines: SOURCE.split("\n").slice(0, 7) });
    expect(calls.some((p) => p.includes(`/files/${FILE}/raw?ref=${HEAD}`))).toBe(true);
  });

  it("reads from the owning commit's diff what that commit did to the line", async () => {
    const calls = stub(
      routes("acme/code2", [
        { new_path: "README.md", diff: "@@ -1 +1 @@\n-a\n+b" },
        { new_path: "src/sync/poll.ts", diff: RENAME },
      ]),
    );
    const ev = await dig("acme/code2");

    expect(ev.code?.change).toEqual({
      artifactId: `commit:${OWNER.slice(0, 8)}`,
      before: "const page = await fetchBatch(cursor, PAGE_SIZE);",
      added: 1,
    });
    expect(calls.filter((p) => p.includes(`/commits/${OWNER}/diff`))).toHaveLength(1);
  });

  it("hands the writer and the audit a line a change only touched, with what it read before", async () => {
    stub(routes("acme/code3", [{ new_path: "src/sync/poll.ts", diff: RENAME }]));
    const ev = await dig("acme/code3");
    const fact = [
      `What the last change did to the marked line: [commit:${OWNER.slice(0, 8)}] rewrote it. Before, it read:`,
      "    const page = await fetchBatch(cursor, PAGE_SIZE);",
    ].join("\n");

    const { prompt, system } = buildSynthesisInput(ev);
    expect(prompt).toContain("> 4 |     const page = await fetchPage(cursor, PAGE_SIZE);");
    expect(prompt).toContain(fact);
    expect(system).toContain("is NOT a\n  reason for this code");
    expect(auditSubject(ev)?.established).toContain(fact);
  });

  it("hands the audit the lines the change added around the line, less the ones changed since", async () => {
    const added = [
      "@@ -1,2 +1,8 @@",
      "+export async function poll(cursor: Cursor) {",
      "+  const rows = [];",
      "+  for (;;) {",
      "+    const page = await fetchPage(cursor, PAGE_SIZE);",
      "+    if (page.length === 0) return rows;",
      "+    rows.push(...page);",
      "+  }",
      " ",
    ].join("\n");
    stub(routes("acme/code5", [{ new_path: "src/sync/poll.ts", diff: added }]));
    const ev = await dig("acme/code5");

    expect(ev.code?.change?.block).toEqual({
      rows: [
        "export async function poll(cursor: Cursor) {",
        "  const rows = [];",
        "  for (;;) {",
        "    const page = await fetchPage(cursor, PAGE_SIZE);",
        "… 1 line changed since …",
        "    rows.push(...page);",
        "  }",
      ],
      at: 3,
    });
    const established = auditSubject(ev)?.established ?? "";
    expect(established).toContain("added around the marked line that still read the same today");
    expect(established).toContain(">     const page = await fetchPage(cursor, PAGE_SIZE);");
    expect(established).not.toContain("return rows;\n    rows.push");
    expect(buildSynthesisInput(ev).prompt).not.toContain("added around the marked line");
  });

  it("says so when a change only re-indented the line", async () => {
    const reindent = [
      "@@ -4 +4 @@",
      "-  const page = await fetchPage(cursor, PAGE_SIZE);",
      "+    const page = await fetchPage(cursor, PAGE_SIZE);",
    ].join("\n");
    stub(routes("acme/code4", [{ new_path: "src/sync/poll.ts", diff: reindent }]));
    const ev = await dig("acme/code4");

    expect(buildSynthesisInput(ev).prompt).toContain("changed only its spacing.");
  });
});

describe("collect — GitLab without a usable patch", () => {
  const plain = { startLine: 1, lines: SOURCE.split("\n").slice(0, 7) };

  it("keeps the code when the diff cannot be read", async () => {
    stub(routes("acme/nopatch1", undefined));
    expect((await dig("acme/nopatch1")).code).toEqual(plain);
  });

  it("keeps the code when the diff does not list the file", async () => {
    stub(routes("acme/nopatch2", [{ new_path: "README.md", diff: "@@ -1 +1 @@\n-a\n+b" }]));
    expect((await dig("acme/nopatch2")).code).toEqual(plain);
  });

  it("keeps the code when GitLab withholds a diff that is too large", async () => {
    stub(routes("acme/nopatch3", [{ new_path: "src/sync/poll.ts", diff: "" }]));
    expect((await dig("acme/nopatch3")).code).toEqual(plain);
  });

  it("keeps the code when the diff does not hold the line", async () => {
    stub(routes("acme/nopatch4", [{ new_path: "src/sync/poll.ts", diff: "@@ -1 +1 @@\n-x\n+y" }]));
    expect((await dig("acme/nopatch4")).code).toEqual(plain);
  });

  it("does not look for a change on a range of lines", async () => {
    const calls = stub(routes("acme/range", [{ new_path: "src/sync/poll.ts", diff: RENAME }]));
    const ev = await dig("acme/range", 3, 5);

    expect(ev.code?.lines).toContain("  for (;;) {");
    expect(ev.code).not.toHaveProperty("change");
    expect(calls.some((p) => p.includes("/diff"))).toBe(false);
  });

  it("returns the evidence without code when the file cannot be read", async () => {
    stub(routes("acme/nofile", [{ new_path: "src/sync/poll.ts", diff: RENAME }], 100, null));
    const ev = await dig("acme/nofile");

    expect(ev.artifacts).toHaveLength(1);
    expect(ev).not.toHaveProperty("code");
  });

  it("shows no code when only the file's history could be read", async () => {
    stub(routes("acme/large", [{ new_path: "src/sync/poll.ts", diff: RENAME }], 5_000_000));
    const ev = await dig("acme/large");

    expect(ev.coverage?.granularity).toBe("file");
    expect(ev).not.toHaveProperty("code");
    expect(auditSubject(ev)?.established).toContain("changed this exact code is not.");
  });
});
