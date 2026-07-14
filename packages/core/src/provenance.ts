import type { Evidence, Provenance } from "./types";

// The deterministic "where did this line come from" fact — independent of whether the
// history explains WHY it is the way it is. Only line-located investigations have a line
// owner; artifact drill-downs (anchored, no location) and evidence with no commits return
// null. The owner is the latest-dated commit, matching blame's "currently owns this line";
// the PR is the one enrichment hung off that commit (parentId), or none on the commits-only
// local path. Never inflates confidence — it adds a separate signal the score can't drift from.
export function traceProvenance(ev: Evidence): Provenance | null {
  if (!ev.location) return null;
  const commits = ev.artifacts.filter((a) => a.kind === "commit");
  if (commits.length === 0) return null;

  const owner = commits.reduce((a, b) => (b.date > a.date ? b : a));
  const pr = ev.artifacts.find((a) => a.kind === "pull_request" && a.parentId === owner.id);

  return { commit: owner.id, ...(pr ? { pr: pr.id } : {}) };
}
