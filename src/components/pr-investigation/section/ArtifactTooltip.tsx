import { displayId, labelTitle } from "../../line-investigation/copy/artifact-copy";
import { gapId, gapTitle } from "../../line-investigation/copy/gap-copy";
import type { ViewArtifact, ViewGap } from "../../line-investigation/model/types";
import { EvidenceLetter } from "../../line-investigation/parts/EvidenceLetter";
import { shortMonthYear } from "../copy/artifact-name";

export function ArtifactTooltip({
  id,
  anchor,
  artifact,
  gap,
  after,
  regions,
}: {
  id: string;
  anchor: { left: number; top: number };
  artifact: ViewArtifact | null;
  gap: ViewGap | null;
  after: ViewArtifact | null;
  regions: string[];
}) {
  if (!artifact && !(gap && after)) return null;
  const letter = gap ? "∅" : artifact!.letter;
  const variant = gap ? "gap" : artifact!.role === "cited" ? "cited" : "supporting";
  const idText = gap && after ? gapId(gap, after) : displayId(artifact!);
  const date = gap ? "—" : shortMonthYear(artifact!.date);
  const title = gap ? gapTitle(gap) : labelTitle(artifact!);
  return (
    <div
      id={id}
      role="tooltip"
      className="pointer-events-none absolute z-10 flex w-59 flex-col gap-0.5 border border-li-divider bg-li-paper px-2.5 py-2 shadow-li-md"
      style={{ left: anchor.left, top: anchor.top }}
    >
      <span className="flex items-center gap-2 font-li-mono text-[11px]">
        <EvidenceLetter letter={letter} variant={variant} />
        <span className="font-medium text-li-ink">{idText}</span>
        <span className="text-li-text-subtle">{date}</span>
      </span>
      <span className={`text-[13px] leading-[1.35] ${gap ? "text-li-gap-ink" : "text-li-ink"}`}>
        {title}
      </span>
      <span className="font-li-mono text-[10.5px] text-li-text-subtle">{regions.join(" · ")}</span>
    </div>
  );
}
