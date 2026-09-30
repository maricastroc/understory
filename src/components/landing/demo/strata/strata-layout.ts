import type {
  InvestigationView,
  ViewArtifact,
  ViewClause,
} from "../../../line-investigation/model/types";
import { STRATA_BREAK_DAYS } from "./strata-metrics";
import type {
  ClauseSlot,
  LineVersion,
  StrataBreak,
  StrataLayout,
  StrataMetrics,
  StrataTrace,
  Stratum,
} from "./types";

const DAY = 86_400_000;
const DATUM = 3;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function dated(view: InvestigationView): Array<{ artifact: ViewArtifact; time: number }> {
  return view.artifacts
    .flatMap((artifact) => {
      const time = Date.parse(artifact.date);
      return artifact.onBore && !Number.isNaN(time) ? [{ artifact, time }] : [];
    })
    .sort((a, b) => b.time - a.time);
}

export function strataLayout(
  view: InvestigationView,
  versions: LineVersion[],
  now: number,
  m: StrataMetrics,
): StrataLayout {
  const items = dated(view);
  const versionOf = new Map(versions.map((v) => [v.artifactId, v]));
  const gapOf = new Map(view.gaps.map((g) => [g.afterId, g]));
  const current = items.find((i) => i.artifact.kind === "commit")?.artifact.id ?? null;
  const strata: Stratum[] = [];
  const breaks: StrataBreak[] = [];

  let cursor = m.datumY + DATUM;
  let previous = now;
  for (const [i, { artifact, time }] of items.entries()) {
    const days = (previous - time) / DAY;
    const gap = gapOf.get(artifact.id) ?? null;
    if (days >= STRATA_BREAK_DAYS && i > 0 && gap?.verified) {
      const top = cursor + m.silent.pad;
      const bottom = top + clamp(days * m.silent.pxPerDay, m.silent.min, m.silent.max);
      breaks.push({ kind: "silent", top, bottom, days, gap });
      cursor = bottom + m.silent.pad;
    } else if (days >= STRATA_BREAK_DAYS) {
      const height = i === 0 ? m.firstBreak : m.gapBreak;
      breaks.push({ kind: "unchanged", top: cursor, bottom: cursor + height, days, gap: null });
      cursor += height;
    } else if (i > 0) {
      cursor += Math.min(m.timePad.max, days * m.timePad.pxPerDay);
    }

    const layer = artifact.kind === "review" ? "sub" : "main";
    const box = m[layer];
    const top = cursor;
    const row = top + box.pad + m.date;
    const quote = artifact.quotes.find((q) => q.range !== null) ?? null;
    const version = versionOf.get(artifact.id) ?? null;
    const isCurrent = artifact.id === current;
    let y = row + box.row + (isCurrent ? m.caption : 0) + (quote ? m.quote : 0);
    let versionY: number | null = null;
    if (version) {
      versionY = y + m.version;
      y = versionY + m.code.line + (version.absent ? m.absent : 0);
    }
    strata.push({
      artifact,
      layer,
      rule: layer === "main" ? "solid" : strata.at(-1)?.layer === "sub" ? null : "dashed",
      top,
      row,
      node: m.date ? top + box.pad + m.date / 2 : row + box.row / 2,
      bottom: y + box.bottom,
      current: isCurrent,
      quote,
      version,
      versionY,
      gap,
    });
    cursor = y + box.bottom;
    previous = time;
  }

  const last = strata.at(-1);
  const origin = !last
    ? m.datumY + DATUM
    : last.versionY !== null
      ? last.versionY + m.code.line + m.tail
      : last.node + m.tail;

  return {
    strata,
    breaks,
    clauses: clauseSlots(view.clauses, strata, breaks, m.clause),
    origin,
    bottom: Math.max(cursor, origin),
  };
}

function clauseSlots(
  clauses: ViewClause[],
  strata: Stratum[],
  breaks: StrataBreak[],
  pitch: number,
): ClauseSlot[] {
  const nodeOf = new Map(strata.map((s) => [s.artifact.id, s.node]));
  const silent = breaks.find((b) => b.kind === "silent");
  const anchored = clauses.flatMap((c) => {
    const anchor = c.silent
      ? silent && (silent.top + silent.bottom) / 2
      : c.citations.map((id) => nodeOf.get(id)).find((y) => y !== undefined);
    return anchor === undefined ? [] : [{ id: c.id, anchor }];
  });
  anchored.sort((a, b) => a.anchor - b.anchor);
  const slots: ClauseSlot[] = [];
  for (const a of anchored) {
    const below = slots.at(-1);
    slots.push({ ...a, y: below ? Math.max(a.anchor, below.y + pitch) : a.anchor });
  }
  return slots;
}

export function strataTrace(layout: StrataLayout, clause: ViewClause): StrataTrace | null {
  const slot = layout.clauses.find((c) => c.id === clause.id);
  if (!slot || clause.silent) return null;
  const nodes = new Map(layout.strata.map((s) => [s.artifact.id, s.node]));
  const ys = clause.citations.flatMap((id) => {
    const y = nodes.get(id);
    return y === undefined ? [] : [y];
  });
  if (ys.length === 0) return null;
  return {
    anchor: slot.anchor,
    stubs: ys.filter((y) => y !== slot.anchor),
    top: Math.min(...ys),
    bottom: Math.max(...ys),
  };
}
