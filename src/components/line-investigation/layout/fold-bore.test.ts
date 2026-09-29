import { describe, expect, it } from "vitest";
import { SYNTHETIC_NOW } from "../fixtures/synthetic-retry-cap";
import * as states from "../fixtures/synthetic-states";
import { buildInvestigationView } from "../model/build-investigation-view";
import { boreInput } from "./bore-input";
import { computeBoreLayout } from "./compute-bore-layout";
import { foldBore } from "./fold-bore";
import { BORE } from "./geometry";

const NOW = Date.parse(SYNTHETIC_NOW);
const DATUM = 200;
const pitch = BORE.labelPitch;

function layoutOf(owners: number) {
  const view = buildInvestigationView(states.syntheticManyOwners(owners), { now: NOW });
  const { items, gaps } = boreInput(view);
  return computeBoreLayout(items, gaps, { now: NOW, datumY: DATUM });
}

describe("foldBore", () => {
  const layout = layoutOf(8);

  it("leaves a history that fits alone", () => {
    expect(foldBore(layout, { datumY: DATUM, limit: DATUM + layout.height + pitch, pitch })).toBe(
      null,
    );
  });

  it("does not fold away fewer rows than it is worth", () => {
    const tops = layout.labels.map((l) => l.top);
    const limit = tops[tops.length - BORE.foldMin + 1] + pitch;
    expect(foldBore(layout, { datumY: DATUM, limit, pitch })).toBe(null);
  });

  it("keeps the newest rows, hides the rest with their absences, and ends at the fold row", () => {
    const limit = DATUM + 8 * pitch;
    const fold = foldBore(layout, { datumY: DATUM, limit, pitch })!;
    expect(fold).not.toBe(null);
    const kept = fold.layout.labels.map((l) => l.id);
    expect(kept).toEqual(layout.labels.slice(0, kept.length).map((l) => l.id));
    expect(fold.layout.labels.every((l) => l.top + pitch <= limit)).toBe(true);
    expect(fold.top).toBe(layout.labels[kept.length].top);
    expect(fold.layout.height).toBe(fold.top + BORE.foldRow - DATUM);

    expect(fold.hiddenArtifacts).toContain("commit:7be210e");
    expect(fold.hidden.has("gap:pull_request:commit:7be210e")).toBe(true);
    expect(fold.layout.gaps.every((g) => kept.includes(g.afterId))).toBe(true);
    expect(fold.layout.glyphs.map((g) => g.id)).toEqual(
      kept.filter((id) => !id.startsWith("gap:")),
    );
    expect(fold.layout.breaks.every((b) => b.top < fold.top)).toBe(true);
    expect(fold.layout.ticks.every((t) => t.y < fold.top)).toBe(true);
    expect(fold.hiddenArtifacts.length + kept.length).toBe(
      layout.glyphs.reduce((n, g) => n + g.members.length, 0),
    );
  });
});
