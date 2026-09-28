import { ArtifactGlyph } from "../../line-investigation/bore/ArtifactGlyph";
import { DatumRule } from "../../line-investigation/bore/DatumRule";
import { GapHatch } from "../../line-investigation/bore/GapHatch";
import { displayId } from "../../line-investigation/copy/artifact-copy";
import { gapLabel, gapLetter, gapTitle } from "../../line-investigation/copy/gap-copy";
import type { ViewArtifact, ViewGap } from "../../line-investigation/model/types";

export function SilentSpecimen({ gap, after }: { gap: ViewGap; after: ViewArtifact }) {
  const direct = gap.missing === "pull_request";
  return (
    <div className="flex items-center gap-4">
      <svg aria-hidden width={60} height={132} className="shrink-0 overflow-visible">
        <DatumRule x1={0} x2={60} y={10} />
        <line x1={30} x2={30} y1={10} y2={44} strokeWidth={1.5} className="stroke-li-ink" />
        <ArtifactGlyph kind={after.kind} x={30} y={50} cited={false} radius={6} />
        <GapHatch x={30} top={60} height={68} verified={gap.verified} />
      </svg>
      <p className="flex flex-col gap-1.5 font-li-mono text-[11.5px]">
        <span className="text-li-ink">
          {displayId(after)}
          {direct ? " · direct commit" : ""}
        </span>
        <span className="text-li-gap-ink">
          {gapLetter(gap)} {gapTitle(gap).toLowerCase()}
        </span>
        <span className="text-li-gap-ink">reason: {gapLabel(gap)}</span>
      </p>
    </div>
  );
}
