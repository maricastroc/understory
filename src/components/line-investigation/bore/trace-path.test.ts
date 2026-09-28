import { describe, expect, it } from "vitest";
import { tracePath } from "./trace-path";

describe("tracePath", () => {
  it("runs down the lane from the clause ring to the deepest cited artifact with a branch per source", () => {
    const t = tracePath({
      laneX: 482,
      branchX: 492,
      startY: 103,
      ringX: 480,
      targets: [398, 558],
      silent: false,
      pinned: true,
    })!;
    expect(t.path).toBe("M482 103 V558 M482 398 H492 M482 558 H492 M482 103 H480");
    expect(t.dots).toEqual([
      { x: 492, y: 398 },
      { x: 492, y: 558 },
    ]);
  });

  it("draws nothing when the clause cites nothing on the bore", () => {
    expect(
      tracePath({
        laneX: 1,
        branchX: 2,
        startY: 0,
        ringX: null,
        targets: [],
        silent: true,
        pinned: false,
      }),
    ).toBeNull();
  });
});
