import type { Artifact, Evidence, Provenance } from "./types";

export function owningCommit(ev: Evidence): Artifact | null {
  if (!ev.location) return null;
  const commits = ev.artifacts.filter((a) => a.kind === "commit");
  if (commits.length === 0) return null;
  return commits.reduce((a, b) => (b.date > a.date ? b : a));
}

export function traceProvenance(ev: Evidence): Provenance | null {
  const owner = owningCommit(ev);
  if (!owner) return null;
  const pr = ev.artifacts.find((a) => a.kind === "pull_request" && a.parentId === owner.id);
  return { commit: owner.id, ...(pr ? { pr: pr.id } : {}) };
}
