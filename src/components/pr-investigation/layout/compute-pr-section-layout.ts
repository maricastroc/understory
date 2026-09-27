import { shortAge } from "../../line-investigation/format/age";
import { tickText } from "../../line-investigation/copy/artifact-copy";
import { timeAxis } from "../../line-investigation/layout/time-axis";
import type { ViewArtifact } from "../../line-investigation/model/types";
import type { PrRegion, PrView, RegionState } from "../model/types";
import { PR_SECTION as G, PR_SCALE } from "./pr-geometry";
import type {
  AxisLabel,
  BandMark,
  CommitMark,
  CoreLayout,
  HatchMark,
  HitTarget,
  IssueMark,
  LetterMark,
  PrMark,
  PrSectionLayout,
  PrSectionOptions,
  TickMark,
} from "./types";

type CoreDef = Omit<CoreLayout, "x" | "bottom" | "cap">;

const clamp = (min: number, v: number, max: number) => Math.min(max, Math.max(min, v));

function combinedState(regions: PrRegion[]): RegionState {
  const states = new Set(regions.map((r) => r.state));
  if (states.size === 1) return regions[0].state;
  if (states.has("unexplained")) return "unexplained";
  return "partial";
}

function coreDefs(regions: PrRegion[], selected: string | null): CoreDef[] {
  const single = (r: PrRegion): CoreDef => ({
    key: r.id,
    regionIds: [r.id],
    label: r.id,
    state: r.state,
    grouped: false,
  });
  if (regions.length <= G.maxCores) return regions.map(single);
  const files = new Map<string, PrRegion[]>();
  for (const r of regions) files.set(r.path, [...(files.get(r.path) ?? []), r]);
  const open = regions.find((r) => r.id === selected)?.path ?? null;
  return [...files.entries()].flatMap(([path, rs]) =>
    path === open || rs.length === 1
      ? rs.map(single)
      : [
          {
            key: `file:${path}`,
            regionIds: rs.map((r) => r.id),
            label: `${rs[0].id}–${rs[rs.length - 1].id}`,
            state: combinedState(rs),
            grouped: true,
          },
        ],
  );
}

function longestRun(indices: number[]): number[] {
  const sorted = [...indices].sort((a, b) => a - b);
  let best: number[] = [];
  let run: number[] = [];
  for (const i of sorted) {
    run = run.length && i === run[run.length - 1] + 1 ? [...run, i] : [i];
    if (run.length > best.length) best = run;
  }
  return best;
}

export function computePrSectionLayout(view: PrView, opts: PrSectionOptions): PrSectionLayout {
  const defs = coreDefs(view.regions, opts.selected);
  const grouped = defs.some((d) => d.grouped) || view.regions.length > G.maxCores;
  const firstX = opts.axisX + G.firstCoreOffset;
  const step = clamp(
    grouped ? G.groupedMinStep : G.minStep,
    (opts.right - firstX - G.rightPad) / Math.max(1, defs.length),
    G.maxStep,
  );
  const xOf = new Map(defs.map((d, i) => [d.key, firstX + i * step]));
  const indexOf = new Map(defs.map((d, i) => [d.key, i]));
  const coreOfRegion = new Map<string, string>();
  for (const d of defs) for (const r of d.regionIds) coreOfRegion.set(r, d.key);
  const coresOf = (id: string) =>
    [...new Set((view.regionsOf.get(id) ?? []).map((r) => coreOfRegion.get(r)!))]
      .filter(Boolean)
      .sort((a, b) => indexOf.get(a)! - indexOf.get(b)!);

  const datum = view.datum.time;
  const timeOf = (iso: string | null) => {
    if (!iso) return null;
    const t = Date.parse(iso);
    return Number.isNaN(t) ? null : Math.min(t, datum);
  };
  const onBore = view.artifacts.filter((a) => timeOf(a.date) !== null);
  const times = onBore.flatMap((a) =>
    [timeOf(a.date)!, timeOf(a.endDate)].filter((t) => t !== null),
  );

  const empty: PrSectionLayout = {
    datumY: opts.datumY,
    axisX: opts.axisX,
    axisBottom: opts.datumY + G.minCore,
    step,
    cores: defs.map((d) => ({
      ...d,
      x: xOf.get(d.key)!,
      bottom: opts.datumY + G.minCore,
      cap: false,
    })),
    commits: [],
    prs: [],
    bands: [],
    reviews: [],
    issues: [],
    hatches: [],
    labels: [],
    breaks: [],
    letters: [],
    targets: [],
    bottom: opts.datumY + G.minCore,
  };
  if (times.length === 0) return empty;

  const axis = timeAxis(times, { now: datum, datumY: opts.datumY, scale: PR_SCALE });
  const yAt = (iso: string) => axis.yOf(timeOf(iso)!);

  const commits: CommitMark[] = [];
  const prs: PrMark[] = [];
  const bands: BandMark[] = [];
  const reviews: TickMark[] = [];
  const issues: IssueMark[] = [];
  const targets: HitTarget[] = [];
  const cited = (a: ViewArtifact) => a.role === "cited";

  for (const a of onBore.filter((x) => x.kind === "pull_request")) {
    const cores = coresOf(a.id);
    if (cores.length === 0) continue;
    let top = a.endDate ? yAt(a.endDate) : yAt(a.date);
    let bottom = yAt(a.date);
    const min = cores.length > 1 ? G.bandMin : G.prMin;
    if (bottom - top < min) {
      const mid = a.endDate ? (top + bottom) / 2 : top;
      top = mid - min / 2;
      bottom = mid + min / 2;
    }
    if (cores.length === 1) {
      const x = xOf.get(cores[0])!;
      prs.push({ id: a.id, core: cores[0], x, top, bottom, cited: cited(a) });
      targets.push({ id: a.id, core: cores[0], left: x - 8, top, width: 16, height: bottom - top });
      continue;
    }
    const run = longestRun(cores.map((c) => indexOf.get(c)!)).map((i) => defs[i].key);
    const x1 = xOf.get(run[0])! - G.bandPad;
    const x2 = xOf.get(run[run.length - 1])! + G.bandPad;
    const outside = cores.filter((c) => !run.includes(c));
    const stubs = outside.map((c) => ({ core: c, x: xOf.get(c)!, top, bottom }));
    const xs = cores.map((c) => xOf.get(c)!);
    bands.push({
      id: a.id,
      cores,
      x1,
      x2,
      top,
      bottom,
      cited: cited(a),
      stubs,
      connector:
        stubs.length > 0
          ? { x1: Math.min(...xs), x2: Math.max(...xs), y: top - G.connectorGap }
          : null,
    });
    for (const c of cores) {
      const x = xOf.get(c)!;
      targets.push({
        id: a.id,
        core: c,
        left: x - G.hit / 2,
        top,
        width: G.hit,
        height: bottom - top,
      });
    }
    targets.push({ id: a.id, core: "*", left: x1, top, width: x2 - x1, height: bottom - top });
  }

  for (const a of onBore.filter((x) => x.kind === "commit")) {
    for (const c of coresOf(a.id)) {
      const x = xOf.get(c)!;
      const y = yAt(a.date);
      commits.push({ id: a.id, core: c, x, y, cited: cited(a) });
      targets.push({ id: a.id, core: c, left: x - 9, top: y - 9, width: 18, height: 18 });
    }
  }

  for (const a of onBore.filter((x) => x.kind === "review")) {
    const band = bands.find((b) => b.id === a.parentId);
    const pr = prs.find((p) => p.id === a.parentId);
    const host = band ?? pr;
    if (host) {
      const y = clamp(host.top + 3, yAt(a.date), host.bottom - 3);
      const x = band ? band.x2 : pr!.x + 6;
      reviews.push({ id: a.id, x, y });
      for (const c of band ? band.cores : [pr!.core]) {
        targets.push({ id: a.id, core: c, left: x, top: y - 5, width: G.tick + 2, height: 10 });
      }
      continue;
    }
    for (const c of coresOf(a.id)) {
      const x = xOf.get(c)! + 6;
      const y = yAt(a.date);
      reviews.push({ id: a.id, x, y });
      targets.push({ id: a.id, core: c, left: x, top: y - 5, width: G.tick + 2, height: 10 });
    }
  }

  for (const a of onBore.filter((x) => x.kind === "issue")) {
    const band = bands.find((b) => b.id === a.parentId);
    const pr = prs.find((p) => p.id === a.parentId);
    if (band) {
      const x = (band.x1 + band.x2) / 2;
      const y = Math.max(yAt(a.date), band.bottom + G.issueGap);
      issues.push({ id: a.id, x, y, cited: cited(a), stem: { y1: band.bottom, y2: y - 8 } });
      for (const c of band.cores) {
        targets.push({ id: a.id, core: c, left: x - 9, top: y - 9, width: 18, height: 18 });
      }
      continue;
    }
    for (const c of pr ? [pr.core] : coresOf(a.id)) {
      const x = xOf.get(c)!;
      const y = Math.max(yAt(a.date), pr ? pr.bottom + 14 : 0);
      issues.push({ id: a.id, x, y, cited: cited(a), stem: null });
      targets.push({ id: a.id, core: c, left: x - 9, top: y - 9, width: 18, height: 18 });
    }
  }

  const ends = new Map<string, { y: number; cap: boolean }>();
  const reach = (core: string, y: number, cap: boolean) => {
    const cur = ends.get(core);
    if (!cur || y > cur.y) ends.set(core, { y, cap });
  };
  for (const c of commits) reach(c.core, c.y, false);
  for (const p of prs) reach(p.core, p.bottom, true);
  for (const b of bands) for (const c of b.cores) reach(c, b.bottom, true);
  for (const i of issues) {
    const core = defs.find((d) => xOf.get(d.key) === i.x);
    if (core) reach(core.key, i.y, false);
  }

  const hatches: HatchMark[] = [];
  for (const gap of view.gaps) {
    const regionId = view.regionsOf.get(gap.id)?.[0];
    const core = regionId ? coreOfRegion.get(regionId) : undefined;
    if (!regionId || !core) continue;
    const def = defs.find((d) => d.key === core)!;
    if (def.grouped && def.state !== "silent") continue;
    if (hatches.some((h) => h.core === core)) continue;
    const host = commits.find((c) => c.id === gap.afterId && c.core === core);
    const hostPr = prs.find((p) => p.id === gap.afterId && p.core === core);
    const hostBottom = host
      ? host.y + G.commitR
      : hostPr
        ? hostPr.bottom
        : (ends.get(core)?.y ?? opts.datumY);
    const x = xOf.get(core)!;
    const top = hostBottom + G.hatchGap;
    hatches.push({ id: gap.id, core, regionId, x, top, height: G.hatchHeight });
    targets.push({ id: gap.id, core, left: x - 11, top, width: 22, height: G.hatchHeight });
  }

  const labels: AxisLabel[] = [
    ...axis.ticks.map((t) => ({ y: t.y, text: tickText(t.days), kind: "tick" as const })),
    ...axis.breaks
      .filter((b) => b.kind === "gap")
      .map((b) => ({ y: b.top + 4, text: `${shortAge(b.days)}\ngap`, kind: "break" as const })),
  ];

  const cores: CoreLayout[] = defs.map((d) => {
    const end = ends.get(d.key);
    return {
      ...d,
      x: xOf.get(d.key)!,
      bottom: end?.y ?? opts.datumY + G.minCore,
      cap: end?.cap ?? false,
    };
  });

  const letters: LetterMark[] = [];
  const selected = opts.showLetters ? view.regions.find((r) => r.id === opts.selected) : undefined;
  if (selected) {
    const core = coreOfRegion.get(selected.id)!;
    const x = xOf.get(core)!;
    const letterOf = new Map(view.artifacts.map((a) => [a.id, a.letter]));
    const wanted: LetterMark[] = [];
    for (const id of selected.artifactIds) {
      const letter = letterOf.get(id);
      if (!letter) continue;
      const commit = commits.find((c) => c.id === id && c.core === core);
      const pr = prs.find((p) => p.id === id && p.core === core);
      const band = bands.find((b) => b.id === id && b.cores.includes(core));
      const review = reviews.find((r) => r.id === id);
      const issue = issues.find((i) => i.id === id && (i.stem !== null || i.x === x));
      if (commit) wanted.push({ id, letter, x: x + G.letterDx, y: commit.y - G.letterH / 2 });
      else if (band)
        wanted.push({
          id,
          letter,
          x: x + G.bandLetterDx,
          y: (band.top + band.bottom) / 2 - G.letterH / 2,
        });
      else if (pr)
        wanted.push({ id, letter, x: x + G.letterDx, y: (pr.top + pr.bottom) / 2 - G.letterH / 2 });
      else if (review)
        wanted.push({ id, letter, x: review.x + G.tick + 4, y: review.y - G.letterH / 2 });
      else if (issue) wanted.push({ id, letter, x: issue.x + 12, y: issue.y - G.letterH / 2 });
    }
    for (const h of hatches.filter((h) => h.regionId === selected.id)) {
      wanted.push({
        id: h.id,
        letter: "∅",
        x: x + G.letterDx,
        y: h.top + G.hatchHeight / 2 - G.letterH / 2,
      });
    }
    for (const w of wanted.sort((a, b) => a.y - b.y)) {
      let y = w.y;
      while (
        letters.some((l) => Math.abs(l.y - y) < G.letterStep && Math.abs(l.x - w.x) < G.letterWidth)
      ) {
        y += G.letterStep;
      }
      letters.push({ ...w, y });
    }
  }

  const bottoms = [
    ...cores.map((c) => c.bottom),
    ...hatches.map((h) => h.top + h.height),
    ...issues.map((i) => i.y + 9),
    ...letters.map((l) => l.y + G.letterH),
  ];
  const deepest = Math.max(opts.datumY + G.minCore, ...bottoms);
  return {
    datumY: opts.datumY,
    axisX: opts.axisX,
    axisBottom: deepest + G.axisTail,
    step,
    cores,
    commits,
    prs,
    bands,
    reviews,
    issues,
    hatches,
    labels,
    breaks: axis.breaks.filter((b) => b.kind === "gap").map((b) => b.top),
    letters,
    targets,
    bottom: deepest + G.axisTail,
  };
}
