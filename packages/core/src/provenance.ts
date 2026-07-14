import type { Artifact, Evidence, Provenance } from "./types";

// The commit that currently owns this line — the blame head, i.e. the latest-dated commit
// among those collected. Only line-located investigations have a line owner; artifact
// drill-downs (anchored, no location) and evidence with no commits return null. Shared by the
// provenance trace and the cosmetic-origin check so both speak about the same commit.
export function owningCommit(ev: Evidence): Artifact | null {
  if (!ev.location) return null;
  const commits = ev.artifacts.filter((a) => a.kind === "commit");
  if (commits.length === 0) return null;
  return commits.reduce((a, b) => (b.date > a.date ? b : a));
}

// The deterministic "where did this line come from" fact — independent of whether the
// history explains WHY it is the way it is. The owner is the blame head; the PR is the one
// enrichment hung off that commit (parentId), or none on the commits-only local path. Never
// inflates confidence — it adds a separate signal the score can't drift from.
export function traceProvenance(ev: Evidence): Provenance | null {
  const owner = owningCommit(ev);
  if (!owner) return null;
  const pr = ev.artifacts.find((a) => a.kind === "pull_request" && a.parentId === owner.id);
  return { commit: owner.id, ...(pr ? { pr: pr.id } : {}) };
}
