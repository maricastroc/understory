import { describe, expect, it } from "vitest";
import { withoutTitle } from "./drawer-body";

const BODY = "Bound retries\n\nUnbounded retries double-charged customers.";

describe("withoutTitle", () => {
  it("drops the repeated title line and shifts the quote range", () => {
    const quote = { start: BODY.indexOf("double"), end: BODY.indexOf("double") + 6 };
    const out = withoutTitle(BODY, "Bound retries", quote);
    expect(out.body).toBe("Unbounded retries double-charged customers.");
    expect(out.body.slice(out.range!.start, out.range!.end)).toBe("double");
  });

  it("keeps the whole body when the quote starts inside the title", () => {
    const quote = { start: 0, end: 5 };
    expect(withoutTitle(BODY, "Bound retries", quote)).toEqual({ body: BODY, range: quote });
  });

  it("keeps a body that is only the title", () => {
    expect(withoutTitle("Add retry loop", "Add retry loop", null).body).toBe("Add retry loop");
  });
});
