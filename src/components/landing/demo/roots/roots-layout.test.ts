import { describe, expect, it } from "vitest";
import { buildInvestigationView } from "../../../line-investigation/model/build-investigation-view";
import * as states from "../../../line-investigation/fixtures/synthetic-states";
import { SYNTHETIC_NOW } from "../../../line-investigation/fixtures/synthetic-retry-cap";
import { LANDING_NOW, landingView } from "../landing-fixture";
import { placeRootsLabels, rootsHeight } from "./place-roots-labels";
import { rootsLayout, rootsTrace } from "./roots-layout";
import { ROOTS_NARROW, ROOTS_TAIL, ROOTS_WIDE, groundY } from "./roots-variants";

const wide = rootsLayout(landingView, LANDING_NOW, ROOTS_WIDE);
const node = (id: string) => wide.nodes.find((n) => n.id === id)!;

describe("rootsLayout", () => {
  it("puts the line's commits on the stem and everything else in its lane", () => {
    expect(wide.nodes.filter((n) => n.x === ROOTS_WIDE.stemX).map((n) => n.id)).toEqual([
      "commit:92f6a3f",
      "commit:7be210e",
    ]);
    expect(node("pr:812").x).toBe(ROOTS_WIDE.lanes.pull_request);
    expect(node("issue:1187").x).toBe(ROOTS_WIDE.lanes.issue);
    expect(node("review:812-1").x).toBe(ROOTS_WIDE.lanes.review);
  });

  it("places older artifacts deeper, below the ground", () => {
    const top = groundY(ROOTS_WIDE);
    expect(wide.stem.top).toBe(top);
    expect(node("commit:92f6a3f").y).toBeGreaterThan(top);
    expect(node("issue:1187").y).toBeGreaterThan(node("pr:812").top);
    expect(node("commit:7be210e").y).toBeGreaterThan(node("issue:1187").y);
    expect(wide.stem.bottom).toBe(node("commit:7be210e").y);
  });

  it("roots every artifact in the commit it reached the line through", () => {
    expect(node("pr:812").via).toBe("commit:92f6a3f");
    expect(node("issue:1187").via).toBe("commit:92f6a3f");
    expect(node("review:812-0").via).toBe("pr:812");
    expect(node("commit:7be210e").d).toBe("");
  });

  it("shows the unrecorded origin as three empty sockets beside its commit", () => {
    expect(wide.sockets.map((s) => s.lane)).toEqual(["pull_request", "issue", "review"]);
    for (const s of wide.sockets) {
      expect(s.y).toBe(node("commit:7be210e").y);
      expect(s.gap.verified).toBe(true);
    }
  });

  it("traces a clause from the ground through its commit to each cited source", () => {
    const trace = rootsTrace(wide, ROOTS_WIDE.stemX, ["issue:1187", "pr:812"]);
    expect(
      trace.startsWith(`M${ROOTS_WIDE.stemX} ${wide.stem.top} V${node("commit:92f6a3f").y}`),
    ).toBe(true);
    expect(trace).toContain(node("issue:1187").d);
    expect(trace).toContain(node("pr:812").d);
    expect(trace).not.toContain(node("review:812-1").d);
  });

  it("reaches reviews through their pull request", () => {
    const trace = rootsTrace(wide, ROOTS_WIDE.stemX, ["review:812-1"]);
    expect(trace).toContain(node("pr:812").d);
    expect(trace).toContain(node("review:812-1").d);
  });

  it("keeps every lane on one side in the narrow form", () => {
    const narrow = rootsLayout(landingView, LANDING_NOW, ROOTS_NARROW);
    for (const n of narrow.nodes) expect(n.x).toBeGreaterThanOrEqual(ROOTS_NARROW.stemX);
    const xs = narrow.sockets.map((s) => s.x).sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) {
      expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(ROOTS_NARROW.socket.width);
    }
  });

  it("draws nothing below the ground when there is no history", () => {
    const view = buildInvestigationView(states.syntheticNoHistory(), {
      now: Date.parse(SYNTHETIC_NOW),
    });
    const empty = rootsLayout(view, Date.parse(SYNTHETIC_NOW), ROOTS_WIDE);
    expect(empty.nodes).toEqual([]);
    expect(empty.sockets).toEqual([]);
    expect(rootsTrace(empty, ROOTS_WIDE.stemX, ["commit:x"])).toBe("");
  });

  it("is deterministic", () => {
    expect(rootsLayout(landingView, LANDING_NOW, ROOTS_WIDE)).toEqual(wide);
  });
});

describe("placeRootsLabels", () => {
  it("lists the history newest first", () => {
    const labels = placeRootsLabels(wide, ROOTS_WIDE, new Set());
    expect(labels.map((l) => l.id)).toEqual([
      "commit:92f6a3f",
      "review:812-1",
      "review:812-0",
      "pr:812",
      "issue:1187",
      "commit:7be210e",
      "gap:pull_request:commit:7be210e",
    ]);
  });

  it("keeps labels in the same lane from overlapping when titles are shown", () => {
    const labels = placeRootsLabels(wide, ROOTS_WIDE, new Set(["review:812-1", "review:812-0"]));
    const [first, second] = labels.filter((l) => l.id.startsWith("review:"));
    expect(second.top).toBeGreaterThanOrEqual(first.top + first.height);
  });

  it("stacks the narrow column with a leader back to each glyph", () => {
    const narrow = rootsLayout(landingView, LANDING_NOW, ROOTS_NARROW);
    const labels = placeRootsLabels(narrow, ROOTS_NARROW, new Set(["issue:1187", "pr:812"]));
    for (let i = 1; i < labels.length; i++) {
      expect(labels[i].top).toBeGreaterThanOrEqual(labels[i - 1].top + labels[i - 1].height);
    }
    for (const l of labels) {
      expect(l.x).toBe(ROOTS_NARROW.labelX);
      expect(l.leader?.[0][1]).toBe(l.depth);
    }
  });

  it("leaves room for the stem's tail and every label", () => {
    const labels = placeRootsLabels(wide, ROOTS_WIDE, new Set());
    const height = rootsHeight(wide, labels);
    expect(height).toBeGreaterThan(wide.stem.bottom + ROOTS_TAIL);
    for (const l of labels) expect(height).toBeGreaterThanOrEqual(l.top + l.height);
  });
});
