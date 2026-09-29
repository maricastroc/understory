import { describe, expect, it } from "vitest";
import { hiddenSides } from "./use-side-scroll";

describe("hiddenSides", () => {
  const xs = [74, 138, 202, 266, 330, 394];

  it("reports nothing when the map fits", () => {
    expect(hiddenSides(xs, { left: 0, width: 460, scrollWidth: 460 })).toEqual({
      scrolls: false,
      before: 0,
      after: 0,
    });
  });

  it("counts the files past each edge of the visible window", () => {
    expect(hiddenSides(xs, { left: 0, width: 280, scrollWidth: 460 })).toEqual({
      scrolls: true,
      before: 0,
      after: 2,
    });
    expect(hiddenSides(xs, { left: 180, width: 280, scrollWidth: 460 })).toEqual({
      scrolls: true,
      before: 2,
      after: 0,
    });
  });

  it("does not count a file whose line is still in view at the edge", () => {
    expect(hiddenSides(xs, { left: 0, width: 420, scrollWidth: 460 }).after).toBe(0);
    expect(hiddenSides(xs, { left: 0, width: 400, scrollWidth: 460 }).after).toBe(1);
  });
});
