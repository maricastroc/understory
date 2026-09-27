import type { DiffResult, LineRange, VerifiedDiffFinding } from "@git-investigator/core/diff/types";
import type { PrRegion, RegionState } from "./types";

type Draft = Omit<PrRegion, "id" | "index" | "state" | "group">;

export function regionKey(path: string, range: LineRange): string {
  return `${path}:${range.start}-${range.end}`;
}

function splitPath(path: string): { dir: string; file: string } {
  const i = path.lastIndexOf("/");
  return { dir: i >= 0 ? path.slice(0, i + 1) : "", file: path.slice(i + 1) };
}

function byDiffOrder(a: Draft, b: Draft): number {
  return a.path.localeCompare(b.path) || a.range.start - b.range.start || a.range.end - b.range.end;
}

function stateOf(findings: VerifiedDiffFinding[], evidenceOnly: boolean): RegionState {
  if (evidenceOnly) return "unexplained";
  if (!findings.some((f) => f.recorded)) return "silent";
  if (findings.every((f) => f.recorded && f.grounded)) return "explained";
  return "partial";
}

function groupsBySharedPr(drafts: Draft[], prIds: Set<string>): Draft[][] {
  const parent = new Map(drafts.map((d) => [d.key, d.key]));
  const find = (k: string): string => {
    let root = k;
    while (parent.get(root) !== root) root = parent.get(root)!;
    parent.set(k, root);
    return root;
  };
  for (const id of prIds) {
    const members = drafts.filter((d) => d.artifactIds.includes(id));
    for (const m of members.slice(1)) parent.set(find(m.key), find(members[0].key));
  }
  const groups = new Map<string, Draft[]>();
  for (const d of drafts) {
    const root = find(d.key);
    groups.set(root, [...(groups.get(root) ?? []), d]);
  }
  return [...groups.values()]
    .map((g) => g.sort(byDiffOrder))
    .sort((a, b) => b.length - a.length || byDiffOrder(a[0], b[0]));
}

export function deriveRegions(result: DiffResult): PrRegion[] {
  const drafts = new Map<string, Draft>();
  const prIds = new Set<string>();
  result.findings.forEach((f, i) => {
    for (const a of f.artifacts) if (a.kind === "pull_request") prIds.add(a.id);
    for (const t of f.targets) {
      const key = regionKey(t.path, t.range);
      let d = drafts.get(key);
      if (!d) {
        d = {
          key,
          path: t.path,
          ...splitPath(t.path),
          range: t.range,
          findings: [],
          artifactIds: [],
          hunk: t.hunk ?? null,
        };
        drafts.set(key, d);
      }
      if (!d.findings.includes(i)) d.findings.push(i);
      if (!d.hunk && t.hunk) d.hunk = t.hunk;
      for (const a of f.artifacts) if (!d.artifactIds.includes(a.id)) d.artifactIds.push(a.id);
    }
  });

  const evidenceOnly = !!result.error;
  return groupsBySharedPr([...drafts.values()], prIds)
    .flatMap((group, g) => group.map((d) => ({ ...d, group: g })))
    .map((d, index) => ({
      ...d,
      id: `R${index + 1}`,
      index,
      state: stateOf(
        d.findings.map((i) => result.findings[i]),
        evidenceOnly,
      ),
    }));
}
