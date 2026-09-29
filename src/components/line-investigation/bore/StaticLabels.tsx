import { artifactName, gapName } from "../copy/accessible-name";
import { displayId, labelTitle } from "../copy/artifact-copy";
import { gapChip } from "../copy/gap-copy";
import type { ViewArtifact, ViewClause, ViewGap } from "../model/types";
import { EvidenceLetter } from "../parts/EvidenceLetter";

const ROW = "grid grid-cols-[20px_minmax(0,1fr)] items-center gap-2 py-0.5 pr-1.5 pl-0.5";
const LINE =
  "flex min-w-0 items-baseline gap-2.5 font-li-mono text-[11px] leading-4 whitespace-nowrap";
const TITLE = "truncate font-li-body text-[13.5px]";

export function StaticArtifactLabel({
  artifact,
  clauses,
  dim,
  show,
}: {
  artifact: ViewArtifact;
  clauses: ViewClause[];
  dim: boolean;
  show: boolean;
}) {
  return (
    <>
      <span className="sr-only">{artifactName(artifact, clauses)}</span>
      <span aria-hidden className={ROW}>
        <EvidenceLetter
          letter={artifact.letter}
          variant={dim ? "dimmed" : artifact.role === "cited" ? "cited" : "supporting"}
        />
        <span className={LINE}>
          <span className={`font-medium ${dim ? "text-li-text-muted" : "text-li-ink"}`}>
            {displayId(artifact)}
          </span>
          {show && (
            <span
              className={`${TITLE} ${artifact.role === "cited" ? "text-li-ink" : "text-li-neutral-800"}`}
            >
              {labelTitle(artifact)}
            </span>
          )}
        </span>
      </span>
    </>
  );
}

export function StaticGapChips({
  gaps,
  after,
  dim,
}: {
  gaps: ViewGap[];
  after: ViewArtifact;
  dim: boolean;
}) {
  return (
    <span className="flex flex-wrap gap-1 pt-0.5 pl-[30px]">
      {gaps.map((gap) => (
        <span key={gap.id}>
          <span className="sr-only">{gapName(gap, after)}</span>
          <span
            aria-hidden
            className={`rounded-[3px] border border-dashed px-1 font-li-mono text-[10.5px] leading-3.5 ${
              gap.verified && !dim
                ? "border-li-gap text-li-gap-ink"
                : "border-li-text-muted text-li-text-muted"
            }`}
          >
            {gapChip(gap)}
          </span>
        </span>
      ))}
    </span>
  );
}
