import { useId } from "react";
import { EvidenceLetter } from "../../line-investigation/parts/EvidenceLetter";
import { prArtifactName, prGapName } from "../copy/artifact-name";
import { regionName } from "../copy/region-copy";
import { PR_SECTION as G } from "../layout/pr-geometry";
import type { CoreLayout, HitTarget, PrSectionLayout } from "../layout/types";
import type { PrClause, PrView } from "../model/types";
import { ArtifactTooltip } from "./ArtifactTooltip";
import { tooltipAnchor } from "./tooltip-anchor";

const FADE = "transition-opacity duration-150 motion-reduce:transition-none";

const tabWidth = (c: CoreLayout) => Math.max(G.tabWidth, c.label.length * 7 + 10);

function coreName(core: CoreLayout, view: PrView): string {
  if (core.regionIds.length === 1) {
    const r = view.regions.find((x) => x.id === core.regionIds[0]);
    return r ? regionName(r) : core.label;
  }
  return `${core.label}, ${core.regionIds.length} regions in one file, grouped`;
}

export function SectionOverlay({
  view,
  layout,
  width,
  activeRegions,
  clause,
  selected,
  hoverArtifact,
  showTooltip,
  onHoverRegion,
  onSelectRegion,
  onHoverArtifact,
  onInspect,
}: {
  view: PrView;
  layout: PrSectionLayout;
  width: number;
  activeRegions: Set<string> | null;
  clause: PrClause | null;
  selected: string | null;
  hoverArtifact: string | null;
  showTooltip: boolean;
  onHoverRegion: (id: string | null) => void;
  onSelectRegion: (id: string) => void;
  onHoverArtifact: (id: string | null) => void;
  onInspect: (id: string) => void;
}) {
  const tooltipId = useId();
  const { datumY, axisX } = layout;
  const artifactById = new Map(view.artifacts.map((a) => [a.id, a]));
  const gapById = new Map(view.gaps.map((g) => [g.id, g]));
  const coreActive = (c: CoreLayout) =>
    !activeRegions || c.regionIds.some((r) => activeRegions.has(r));
  const primaryRegion = (c: CoreLayout) => c.regionIds[0];
  const tooltip = showTooltip && hoverArtifact ? tooltipAnchor(hoverArtifact, layout, width) : null;

  const nameOf = (t: HitTarget, core: CoreLayout) => {
    const gap = gapById.get(t.id);
    if (gap) {
      const after = artifactById.get(gap.afterId);
      return after ? prGapName(gap, after) : "∅, not recorded";
    }
    const a = artifactById.get(t.id);
    return a ? prArtifactName(a, view.regionsOf.get(a.id) ?? [], primaryRegion(core)) : t.id;
  };

  const letterVariant = (id: string) => {
    if (gapById.has(id)) return "gap" as const;
    return artifactById.get(id)?.role === "cited" ? ("cited" as const) : ("supporting" as const);
  };

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute w-10.5 text-right font-li-mono text-[9.5px] leading-[1.1] text-li-datum-ink"
        style={{ left: axisX - 50, top: datumY - 21 }}
      >
        ±0
        <br />
        {view.datum.label}
      </div>
      {layout.labels.map((l) => (
        <div
          key={`${l.kind}-${l.y}`}
          aria-hidden
          className="pointer-events-none absolute w-10 text-right font-li-mono text-[9.5px] leading-[1.2] whitespace-pre text-li-text-subtle"
          style={{ left: axisX - 54, top: l.kind === "tick" ? l.y - 6 : l.y }}
        >
          {l.text}
        </div>
      ))}

      {layout.cores.map((c) => {
        const isSelected = selected !== null && c.regionIds.includes(selected);
        const citedByClause =
          clause !== null && c.regionIds.some((r) => clause.regions.includes(r));
        const silent = c.state === "silent";
        return (
          <div key={`tab-${c.key}`}>
            <button
              type="button"
              aria-label={coreName(c, view)}
              aria-pressed={isSelected}
              onClick={() => onSelectRegion(primaryRegion(c))}
              onMouseEnter={() => onHoverRegion(primaryRegion(c))}
              onMouseLeave={() => onHoverRegion(null)}
              onFocus={() => onHoverRegion(primaryRegion(c))}
              onBlur={() => onHoverRegion(null)}
              className={`absolute cursor-pointer border p-0 font-li-mono text-[10.5px] whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-li-steel ${FADE} ${
                isSelected
                  ? "border-li-ink bg-li-ink text-li-paper"
                  : `${silent ? "border-dashed border-li-gap text-li-gap-ink" : "border-li-ink text-li-ink"} ${
                      citedByClause ? "bg-li-neutral-200" : "bg-li-paper"
                    }`
              }`}
              style={{
                left: c.x - tabWidth(c) / 2,
                top: datumY - G.tabGap - G.tabHeight,
                width: tabWidth(c),
                height: G.tabHeight,
                opacity: coreActive(c) ? 1 : 0.18,
              }}
            >
              {c.label}
            </button>
            <button
              type="button"
              aria-hidden
              tabIndex={-1}
              onClick={() => onSelectRegion(primaryRegion(c))}
              onMouseEnter={() => onHoverRegion(primaryRegion(c))}
              onMouseLeave={() => onHoverRegion(null)}
              className="absolute cursor-pointer border-0 bg-transparent p-0"
              style={{
                left: c.x - G.hit / 2,
                top: datumY + 6,
                width: G.hit,
                height: Math.max(0, c.bottom - datumY - 6),
              }}
            />
          </div>
        );
      })}

      {layout.targets
        .filter((t) => t.core === "*")
        .map((t) => (
          <div
            key={`band-${t.id}`}
            aria-hidden
            onMouseEnter={() => onHoverArtifact(t.id)}
            onMouseLeave={() => onHoverArtifact(null)}
            onClick={() => onInspect(t.id)}
            className="absolute cursor-pointer"
            style={{ left: t.left, top: t.top, width: t.width, height: t.height }}
          />
        ))}

      {layout.cores.map((c) => {
        const own = layout.targets.filter((t) => t.core === c.key);
        const seen = new Set<string>();
        const targets = own.filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)));
        return (
          <section key={`history-${c.key}`} aria-label={`History of ${c.label}`}>
            <ol>
              {targets.map((t) => (
                <li key={`${c.key}-${t.id}`}>
                  <button
                    type="button"
                    aria-label={nameOf(t, c)}
                    aria-describedby={tooltip && hoverArtifact === t.id ? tooltipId : undefined}
                    onMouseEnter={() => onHoverArtifact(t.id)}
                    onMouseLeave={() => onHoverArtifact(null)}
                    onFocus={() => onHoverArtifact(t.id)}
                    onBlur={() => onHoverArtifact(null)}
                    onClick={() => onInspect(t.id)}
                    className="absolute cursor-pointer rounded-xs border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-li-steel"
                    style={{ left: t.left, top: t.top, width: t.width, height: t.height }}
                  />
                </li>
              ))}
            </ol>
          </section>
        );
      })}

      {layout.letters.map((l) => (
        <span
          key={`letter-${l.id}`}
          aria-hidden
          className="pointer-events-none absolute"
          style={{ left: l.x, top: l.y }}
        >
          <EvidenceLetter letter={l.letter} variant={letterVariant(l.id)} />
        </span>
      ))}

      {tooltip && (
        <ArtifactTooltip
          id={tooltipId}
          anchor={tooltip}
          artifact={artifactById.get(hoverArtifact!) ?? null}
          gap={gapById.get(hoverArtifact!) ?? null}
          after={
            gapById.get(hoverArtifact!)
              ? (artifactById.get(gapById.get(hoverArtifact!)!.afterId) ?? null)
              : null
          }
          regions={view.regionsOf.get(hoverArtifact!) ?? []}
        />
      )}
    </>
  );
}
