import { describe, expect, it } from "vitest";
import { foldComments, placedComments } from "./comments";

const by = (login: string) => ({ __typename: "User", login });
const comment = (over: object = {}) => ({
  author: by("ana"),
  body: "It is not necessary to check the severity here.",
  createdAt: "2024-01-01T00:00:00Z",
  path: "src/ruleLoader.ts",
  outdated: false,
  diffHunk: "@@ -1,2 +1,3 @@\n keep();\n+check(severity);",
  line: 3,
  ...over,
});

describe("placedComments — where each review comment was made", () => {
  it("keeps the file, the line, whether it is outdated, and the end of the hunk", () => {
    expect(placedComments([comment()])).toEqual([
      {
        body: "It is not necessary to check the severity here.",
        path: "src/ruleLoader.ts",
        diffHunk: "@@ -1,2 +1,3 @@\n keep();\n+check(severity);",
        outdated: false,
        line: 3,
      },
    ]);
  });

  it("leaves out a comment whose place the host did not give", () => {
    expect(placedComments([comment({ path: null }), comment({ diffHunk: "" })])).toEqual([]);
    expect(placedComments([{ author: by("ana"), body: "fine", createdAt: "" }])).toEqual([]);
  });

  it("takes a position as outdated unless the host says it is current, and a missing line as unknown", () => {
    const [placed] = placedComments([comment({ outdated: null, line: null })]);
    expect(placed).toMatchObject({ outdated: true, line: null });
  });

  it("keeps the same comments the review's text is folded from", () => {
    const bot = comment({ author: { __typename: "Bot", login: "codecov" }, body: "coverage" });
    const many = Array.from({ length: 12 }, (_, i) => comment({ body: `comment ${i}` }));
    const placed = placedComments([bot, comment({ body: "  " }), ...many]);
    expect(placed).toHaveLength(8);
    const folded = foldComments("", [bot, comment({ body: "  " }), ...many]);
    for (const c of placed) expect(folded).toContain(c.body);
    expect(folded).not.toContain("comment 8");
  });

  it("cuts a long comment and a long hunk", () => {
    const hunk = Array.from({ length: 40 }, (_, i) => `+row ${i} ${"x".repeat(200)}`).join("\n");
    const [placed] = placedComments([comment({ body: "y".repeat(3000), diffHunk: hunk })]);
    expect(placed.body).toHaveLength(800);
    expect(placed.diffHunk.length).toBeLessThanOrEqual(800);
    expect(placed.diffHunk.endsWith("x")).toBe(true);
  });
});
