import { artifactName, gapName } from "../copy/accessible-name";
import { displayId, labelTitle } from "../copy/artifact-copy";
import { gapLabel, gapLetter, gapTitle } from "../copy/gap-copy";
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

export function StaticGapLabel({
  gap,
  after,
  dim,
  show,
}: {
  gap: ViewGap;
  after: ViewArtifact;
  dim: boolean;
  show: boolean;
}) {
  const ink = gap.verified && !dim ? "text-li-gap-ink" : "text-li-text-muted";
  return (
    <>
      <span className="sr-only">{gapName(gap, after)}</span>
      <span aria-hidden className={ROW}>
        <EvidenceLetter
          letter={gapLetter(gap)}
          variant={dim ? "dimmed" : gap.verified ? "gap" : "unverified"}
        />
        <span className={LINE}>
          <span className={ink}>{gapLabel(gap)}</span>
          {show && <span className={`${TITLE} ${ink}`}>{gapTitle(gap)}</span>}
        </span>
      </span>
    </>
  );
}
