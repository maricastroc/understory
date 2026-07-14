// Where a line comes from, as a deterministic fact: the commit that currently owns it
// (the blame head) and — when the code was collected from a forge — the pull/merge request
// that commit came in through. Derived from the collected artifacts, never the model, so it
// holds even when the recorded history does not explain WHY the line is the way it is. This
// is what lets an honest MEDIUM read as "origin traced, rationale thin" rather than "failed".
export type Provenance = {
  commit: string; // artifact id of the commit that last set this line
  pr?: string; // artifact id of the PR/MR that commit came through, if collected
};
