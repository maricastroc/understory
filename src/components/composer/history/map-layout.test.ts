import { describe, expect, it } from "vitest";
import { syntheticCaseCounts, syntheticOverview } from "../fixtures/synthetic-overview";
import { layoutMap } from "./map-layout";
import { MAP } from "./map-geometry";

describe("layoutMap", () => {
  const layout = layoutMap(syntheticOverview.files, 1120, syntheticCaseCounts);

  it("groups by folder in rank order and sorts files alphabetically inside each folder", () => {
    expect(layout.dirs.map((d) => d.key)).toEqual([
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

describe("layoutMap — folder labels", () => {
  const file = (path: string) => ({ ...syntheticOverview.files[0], path });
  const monorepo = layoutMap(
    [
      "packages/styled-components/src/models/ComponentStyle.ts",
      "packages/styled-components/src/models/StyledComponent.ts",
      "packages/styled-components/src/models/StyledNativeComponent.ts",
      "packages/styled-components/src/native/index.ts",
      "packages/styled-components/src/index.ts",
      "packages/native-showcase/src/index.ts",
      "packages/native-showcase/src/components/CornerShapeBoard.tsx",
      "packages/sandbox/src/index.ts",
    ].map(file),
    1120,
    new Map(),
  );
  const label = (key: string) => monorepo.dirs.find((d) => d.key === key)?.label;

  it("keeps the whole path when it fits the room up to the next group", () => {
    const layout = layoutMap(syntheticOverview.files, 1120, syntheticCaseCounts);
    expect(layout.dirs[0]).toMatchObject({ key: "src/billing/", label: "src/billing/" });
  });

  it("drops the shared leading folders so narrow groups show what tells them apart", () => {
    expect(monorepo.mode).toBe("dense");
    expect(label("packages/styled-components/src/native/")).toBe("…/native/");
    expect(label("packages/native-showcase/src/components/")).toBe("…/components/");
  });

  it("keeps enough trailing folders to tell same-named folders apart", () => {
    expect(label("packages/styled-components/src/")).toBe("…/styled-components/src/");
    expect(label("packages/native-showcase/src/")).toBe("…/native-showcase/src/");
    expect(label("packages/sandbox/src/")).toBe("…/sandbox/src/");
    const labels = monorepo.dirs.map((d) => d.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("shows as many trailing folders as the room up to the next group allows", () => {
    const models = monorepo.dirs.find((d) => d.key === "packages/styled-components/src/models/")!;
    expect(models.label).toBe("…/src/models/");
    expect(models.label.length * MAP.dirChar).toBeLessThanOrEqual(models.room);
  });

  it("lets a single-file group's label use the gap up to the next group", () => {
    const native = monorepo.dirs.find((d) => d.key === "packages/styled-components/src/native/")!;
    expect(native.room).toBe(monorepo.step + MAP.dirGap - MAP.dirLabelGap);
    expect(native.room).toBeGreaterThan(native.width);
  });
});
