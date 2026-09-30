import type { ArtifactKind } from "@understory/core/types";
import type { InvestigationView, ViewArtifact } from "../model/types";
import type { HistoryItem, HistoryMember, HistoryModel, HistoryStratum } from "./types";

const DAY = 86_400_000;
export const QUIET_DAYS = 45;
export const MIN_RUN = 3;

const RANK: Record<ArtifactKind, number> = { commit: 0, pull_request: 1, review: 2, issue: 3 };

const timeOf = (a: ViewArtifact) => Date.parse(a.date);

function rootOf(a: ViewArtifact, byId: Map<string, ViewArtifact>): ViewArtifact {
  let cur = a;
  for (let i = 0; i < 5; i++) {
    if (cur.kind === "commit") return cur;
    const parent = cur.parentId ? byId.get(cur.parentId) : undefined;
    if (!parent || !parent.onBore) return cur;
    cur = parent;
  }
  return cur;
}

function tree(root: ViewArtifact, children: Map<string, ViewArtifact[]>): HistoryMember[] {
  const out: HistoryMember[] = [];
  const walk = (a: ViewArtifact, depth: number) => {
    out.push({ artifact: a, depth });
    const kids = [...(children.get(a.id) ?? [])].sort(
      (x, y) => RANK[x.kind] - RANK[y.kind] || timeOf(y) - timeOf(x) || x.id.localeCompare(y.id),
    );
    for (const k of kids) walk(k, depth + 1);
  };
  walk(root, 0);
  return out;
}

export function historyModel(
  view: Pick<InvestigationView, "artifacts" | "gaps">,
  now: number,
): HistoryModel {
  const onBore = view.artifacts.filter((a) => a.onBore && !Number.isNaN(timeOf(a)));
  const byId = new Map(onBore.map((a) => [a.id, a]));
  const roots = new Map<string, ViewArtifact>();
  const children = new Map<string, ViewArtifact[]>();
  for (const a of onBore) {
    const root = rootOf(a, byId);
    roots.set(root.id, root);
    if (root.id === a.id) continue;
    const parent = a.parentId && byId.has(a.parentId) ? a.parentId : root.id;
    children.set(parent, [...(children.get(parent) ?? []), a]);
  }

  const current = onBore.find((a) => a.kind === "commit")?.id ?? null;
  const strata: HistoryStratum[] = [...roots.values()]
    .sort((a, b) => timeOf(b) - timeOf(a) || RANK[a.kind] - RANK[b.kind])
    .map((anchor) => {
      const members = tree(anchor, children);
      const ids = new Set(members.map((m) => m.artifact.id));
      return {
        id: anchor.id,
        time: timeOf(anchor),
        anchor,
        members,
        gaps: view.gaps.filter((g) => ids.has(g.afterId)),
        current: anchor.id === current,
      };
    });

  const items: HistoryItem[] = [];
  let previous = now;
  strata.forEach((stratum, index) => {
    const days = (previous - stratum.time) / DAY;
    if (days >= QUIET_DAYS) items.push({ type: "break", days, first: index === 0 });
    items.push({ type: "stratum", stratum, index });
    previous = stratum.time;
  });

  const oldest = strata.at(-1);
  return {
    items: foldRuns(items),
    strata,
    loose: view.artifacts.filter((a) => !byId.has(a.id)),
    originDays: oldest ? (now - oldest.time) / DAY : null,
  };
}

const quiet = (s: HistoryStratum) =>
  !s.current &&
  s.members.every((m) => m.artifact.role !== "cited" && m.artifact.quotes.length === 0);

function foldRuns(items: HistoryItem[]): HistoryItem[] {
  const out: HistoryItem[] = [];
  let run: HistoryItem[] = [];
  const flush = () => {
    const strata = run.flatMap((i) => (i.type === "stratum" ? [i.stratum] : []));
    if (strata.length >= MIN_RUN) {
      const trailing = run.at(-1)?.type === "break" ? [run.pop()!] : [];
      out.push({ type: "run", id: `run:${strata[0].id}`, items: run, strata });
      out.push(...trailing);
    } else {
      out.push(...run);
    }
    run = [];
  };
  for (const item of items) {
    if (item.type === "stratum" && quiet(item.stratum)) {
      run.push(item);
    } else if (item.type === "break" && run.length > 0) {
      run.push(item);
    } else {
      flush();
      out.push(item);
    }
  }
  flush();
  return out;
}
