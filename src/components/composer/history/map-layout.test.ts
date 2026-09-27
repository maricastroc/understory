import { describe, expect, it } from "vitest";
import { syntheticCaseCounts, syntheticOverview } from "../fixtures/synthetic-overview";
import { layoutMap } from "./map-layout";
import { MAP } from "./map-geometry";

describe("layoutMap", () => {
  const layout = layoutMap(syntheticOverview.files, 1120, syntheticCaseCounts);

  it("groups by folder in rank order and sorts files alphabetically inside each folder", () => {
    expect(layout.dirs.map((d) => d.label)).toEqual([
      "src/billing/",
      "src/webhooks/",
      "config/",
      "src/lib/",
      "tests/",
    ]);
    expect(layout.cores.slice(0, 4).map((c) => c.name)).toEqual([
      "charge.ts",
      "invoice.ts",
      "ledger.ts",
      "refund.ts",
    ]);
  });

  it("uses the design's step and folder gap when the files fit", () => {
    const xs = layout.cores.map((c) => c.x);
    expect(xs[0]).toBe(MAP.firstX);
    expect(xs[1] - xs[0]).toBe(MAP.step);
    expect(xs[4] - xs[3]).toBe(MAP.step + MAP.dirGap);
    expect(layout.dirs[0]).toMatchObject({ left: MAP.firstX - 10, width: 3 * MAP.step + 40 });
  });

  it("carries case counts and never exceeds the width it was given when it fits", () => {
    expect(layout.cores.find((c) => c.name === "charge.ts")?.cases).toBe(3);
    expect(layout.width).toBe(1120);
  });

  it("tightens the step down to its minimum, then grows the canvas to scroll", () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      ...syntheticOverview.files[0],
      path: `d${i}/f${i}.ts`,
    }));
    const tight = layoutMap(many, 1120, new Map());
    expect(tight.cores[1].x - tight.cores[0].x).toBe(MAP.minStep + MAP.dirGap);
    expect(tight.width).toBeGreaterThan(1120);
  });

  it("labels files at the repository root", () => {
    const root = layoutMap([{ ...syntheticOverview.files[0], path: "index.js" }], 1120, new Map());
    expect(root.dirs[0].label).toBe("./");
    expect(root.cores[0]).toMatchObject({ dir: "", name: "index.js" });
  });
});
