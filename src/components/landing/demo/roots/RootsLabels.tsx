import { artifactName, gapName } from "../../../line-investigation/copy/accessible-name";
import { dateLine, displayId, labelTitle } from "../../../line-investigation/copy/artifact-copy";
import { gapBody, gapLabel, gapLetter, gapTitle } from "../../../line-investigation/copy/gap-copy";
import type {
  InvestigationView,
  ViewArtifact,
  ViewGap,
} from "../../../line-investigation/model/types";
import { EvidenceLetter } from "../../../line-investigation/parts/EvidenceLetter";
import type { RootsLabel, RootsVariant } from "./types";

function ArtifactLabel({
  artifact,
  view,
  dim,
  show,
  end,
  wide,
}: {
  artifact: ViewArtifact;
  view: InvestigationView;
  dim: boolean;
  show: boolean;
  end: boolean;
  wide: boolean;
}) {
  return (
    <>
      <span className="sr-only">{artifactName(artifact, view.clauses)}</span>
      <span
        aria-hidden
        className={`flex min-w-0 flex-col gap-0.5 ${end ? "items-end text-right" : "items-start"}`}
      >
        <span
          className={`flex items-center gap-2 font-li-mono text-[11px] leading-4 whitespace-nowrap ${
            end ? "flex-row-reverse" : ""
          }`}
        >
          <EvidenceLetter
            letter={artifact.letter}
            variant={dim ? "dimmed" : artifact.role === "cited" ? "cited" : "supporting"}
          />
          <span className={`font-medium ${dim ? "text-li-text-muted" : "text-li-ink"}`}>
            {displayId(artifact)}
          </span>
          {show && wide && <span className="text-li-text-subtle">{dateLine(artifact)}</span>}
        </span>
        {show && (
          <span
            className={`max-w-full truncate text-[13.5px] leading-[1.35] ${
              artifact.role === "cited" ? "text-li-ink" : "text-li-neutral-800"
            }`}
          >
            {labelTitle(artifact)}
          </span>
        )}
      </span>
    </>
  );
}

function GapLabel({ gap, after, wide }: { gap: ViewGap; after: ViewArtifact; wide: boolean }) {
  const ink = gap.verified ? "text-li-gap-ink" : "text-li-text-muted";
  return (
    <>
      <span className="sr-only">{gapName(gap, after)}</span>
      <span aria-hidden className="flex min-w-0 flex-col gap-1">
        <span className={`flex items-center gap-2 font-li-mono text-[11px] leading-4 ${ink}`}>
          <EvidenceLetter letter={gapLetter(gap)} variant={gap.verified ? "gap" : "unverified"} />
          {gapLabel(gap)}
        </span>
        <span className={`text-[13.5px] leading-[1.35] ${ink}`}>{gapTitle(gap)}</span>
        {wide && (
          <span className="text-[12.5px] leading-[1.4] text-li-text-subtle">
            {gapBody(gap, after)}
          </span>
        )}
      </span>
    </>
  );
}

export function RootsLabels({
  labels,
  view,
  active,
  variant,
}: {
  labels: RootsLabel[];
  view: InvestigationView;
  active: ReadonlySet<string> | null;
  variant: RootsVariant;
}) {
  const byId = new Map(view.artifacts.map((a) => [a.id, a]));
  const gaps = new Map(view.gaps.map((g) => [g.id, g]));
  const wide = variant.mode === "wide";
  const column = variant.labelX !== null;

  return (
    <ol aria-label="History, newest first" className="pointer-events-none absolute inset-0">
      {labels.map((l) => {
        const gap = l.kind === "gap" ? gaps.get(l.id) : undefined;
        const artifact = gap ? byId.get(gap.afterId) : byId.get(l.id);
        if (!artifact) return null;
        return (
          <li
            key={l.id}
            className={`absolute flex ${l.align === "end" ? "-translate-x-full" : ""}`}
            style={{
              top: l.top,
              left: l.x,
              right: column ? 0 : undefined,
              width: l.width ?? undefined,
              minHeight: l.height,
            }}
          >
            {gap ? (
              <GapLabel gap={gap} after={artifact} wide={wide} />
            ) : (
              <ArtifactLabel
                artifact={artifact}
                view={view}
                dim={active !== null && !active.has(artifact.id)}
                show={!!active?.has(artifact.id)}
                end={l.align === "end"}
                wide={wide}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
