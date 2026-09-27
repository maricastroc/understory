import { hunkFor } from "./hunk";
import type { BlamedTarget, BlameTarget, ChangeCluster, FileChange, LineRange } from "./types";

export type SelectOptions = {
  mergeGap?: number;
  maxPerFile?: number;
  maxTargets?: number;
};

const DEFAULTS = { mergeGap: 3, maxPerFile: 12, maxTargets: 30 } as const;

export type SelectResult = {
  targets: BlameTarget[];
  filesConsidered: number;
  filesSkipped: number;
  truncated: boolean;
};

function mergeRanges(ranges: LineRange[], gap: number): LineRange[] {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const out: LineRange[] = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const r = sorted[i];
    const last = out[out.length - 1];
    if (r.start - last.end - 1 <= gap) {
      last.end = Math.max(last.end, r.end);
    } else {
      out.push({ ...r });
    }
  }
  return out;
}

export function selectBlameTargets(files: FileChange[], opts: SelectOptions = {}): SelectResult {
  const mergeGap = opts.mergeGap ?? DEFAULTS.mergeGap;
  const maxPerFile = opts.maxPerFile ?? DEFAULTS.maxPerFile;
  const maxTargets = opts.maxTargets ?? DEFAULTS.maxTargets;

  const targets: BlameTarget[] = [];
  let filesConsidered = 0;
  let filesSkipped = 0;
  let truncated = false;

  for (const f of files) {
    const path = f.oldPath;
    if (f.binary || !path || f.removedRanges.length === 0) {
      filesSkipped++;
      continue;
    }
    filesConsidered++;

    const merged = mergeRanges(f.removedRanges, mergeGap);
    const kept = merged.slice(0, maxPerFile);
    if (kept.length < merged.length) truncated = true;

    for (const range of kept) {
      if (targets.length >= maxTargets) {
        truncated = true;
        break;
      }
      const hunk = f.changes ? hunkFor(f.changes, range) : undefined;
      targets.push({ path, range, ...(hunk ? { hunk } : {}) });
    }
  }

  return { targets, filesConsidered, filesSkipped, truncated };
}

const key = (t: BlameTarget): string => `${t.path}:${t.range.start}-${t.range.end}`;

export function clusterByCommit(blamed: BlamedTarget[]): ChangeCluster[] {
  const order: string[] = [];
  const byCommit = new Map<string, Map<string, BlameTarget>>();

  for (const { target, commitId } of blamed) {
    let group = byCommit.get(commitId);
    if (!group) {
      group = new Map();
      byCommit.set(commitId, group);
      order.push(commitId);
    }
    const k = key(target);
    if (!group.has(k)) group.set(k, target);
  }

  return order.map((commitId) => ({
    commitId,
    targets: [...byCommit.get(commitId)!.values()],
  }));
}
