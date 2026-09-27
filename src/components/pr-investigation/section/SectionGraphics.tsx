import { useId } from "react";
import { ArtifactGlyph } from "../../line-investigation/bore/ArtifactGlyph";
import { AxisBreakMark } from "../../line-investigation/bore/AxisBreakMark";
import { PR_SECTION as G } from "../layout/pr-geometry";
import type { PrSectionLayout } from "../layout/types";
import type { PrClause, PrView } from "../model/types";

const FADE = "transition-opacity duration-150 motion-reduce:transition-none";
const DIM = 0.18;

export function SectionGraphics({
  view,
  layout,
  width,
  activeRegions,
  clause,
  pinned,
  selected,
  inspected,
}: {
  view: PrView;
  layout: PrSectionLayout;
  width: number;
  activeRegions: Set<string> | null;
  clause: PrClause | null;
  pinned: boolean;
  selected: string | null;
  inspected: string | null;
}) {
  const hatch = useId();
  const { datumY, axisX } = layout;
  const coreActive = new Map(
    layout.cores.map((c) => [
      c.key,
      !activeRegions || c.regionIds.some((r) => activeRegions.has(r)),
    ]),
  );
  const artifactOpacity = (id: string) => {
    if (!activeRegions) return 1;
    return (view.regionsOf.get(id) ?? []).some((r) => activeRegions.has(r)) ? 1 : DIM;
  };
  const selectedCore = selected
    ? layout.cores.find((c) => c.regionIds.includes(selected))
    : undefined;

  const combY = datumY - G.tabGap - G.tabHeight - G.combGap;
  const cited = clause
    ? layout.cores.filter((c) => c.regionIds.some((r) => clause.regions.includes(r)))
    : [];
  const xs = cited.map((c) => c.x);
  const combColor = clause?.silent ? "stroke-li-gap" : "stroke-li-evidence";

  const ringFor = () => {
    if (!inspected) return null;
    const onSelected = (core: string) => !selectedCore || core === selectedCore.key;
    const commit =
      layout.commits.find((c) => c.id === inspected && onSelected(c.core)) ??
      layout.commits.find((c) => c.id === inspected);
    if (commit) return { x: commit.x, y: commit.y };
    const issue = layout.issues.find((i) => i.id === inspected);
    if (issue) return { x: issue.x, y: issue.y };
    const pr = layout.prs.find((p) => p.id === inspected);
    if (pr) return { x: pr.x, y: (pr.top + pr.bottom) / 2 };
    return null;
  };
  const ring = ringFor();

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-visible"
      width="100%"
      height={layout.bottom}
    >
      <defs>
        <pattern
          id={hatch}
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="6" strokeWidth="1" className="stroke-li-gap" />
        </pattern>
      </defs>

      {selectedCore && (
        <rect
          x={selectedCore.x - 22}
          y={datumY}
          width={44}
          height={Math.max(24, selectedCore.bottom - datumY + 14)}
          className="fill-li-steel-100"
        />
      )}

      <line
        x1={axisX}
        x2={axisX}
        y1={datumY}
        y2={layout.axisBottom}
        className="stroke-li-neutral-400"
      />
      {layout.breaks.map((top) => (
        <AxisBreakMark key={`break-${top}`} x={axisX} top={top} />
      ))}

      {clause && xs.length > 0 && (
        <g opacity={pinned ? 1 : 0.6} className={FADE}>
          <path
            d={`M${Math.min(...xs)} ${combY} H${Math.max(...xs)}`}
            fill="none"
            strokeWidth={2}
            strokeDasharray={clause.silent ? "4 3" : undefined}
            className={combColor}
          />
          {cited.map((c) => {
            const silentDrop = !clause.silent && c.state === "silent";
            return (
              <path
                key={`drop-${c.key}`}
                d={`M${c.x} ${combY} V${combY + 8}`}
                fill="none"
                strokeWidth={2}
                strokeDasharray={clause.silent || silentDrop ? "4 3" : undefined}
                className={silentDrop ? "stroke-li-gap" : combColor}
              />
            );
          })}
        </g>
      )}

      {layout.bands.map((b) => (
        <g key={b.id} opacity={artifactOpacity(b.id)} className={FADE}>
          {b.connector && (
            <line
              x1={b.connector.x1}
              x2={b.connector.x2}
              y1={b.connector.y}
              y2={b.connector.y}
              strokeDasharray="3 3"
              className="stroke-li-evidence-edge"
            />
          )}
          <rect
            x={b.x1}
            y={b.top}
            width={b.x2 - b.x1}
            height={b.bottom - b.top}
            strokeWidth={inspected === b.id ? 1.5 : 1}
            className={`${b.cited ? "fill-li-evidence-tint" : "fill-li-paper"} ${
              inspected === b.id
                ? "stroke-li-steel"
                : b.cited
                  ? "stroke-li-evidence-edge"
                  : "stroke-li-ink"
            }`}
          />
          {b.stubs.map((s) => (
            <rect
              key={`stub-${s.core}`}
              x={s.x - 6}
              y={s.top}
              width={12}
              height={s.bottom - s.top}
              className={
                b.cited
                  ? "fill-li-evidence-tint stroke-li-evidence-edge"
                  : "fill-li-paper stroke-li-ink"
              }
            />
          ))}
        </g>
      ))}

      {layout.cores.map((c) => (
        <g key={c.key} opacity={coreActive.get(c.key) ? 1 : DIM} className={FADE}>
          <line
            x1={c.x}
            x2={c.x}
            y1={datumY}
            y2={c.bottom}
            strokeWidth={1.5}
            className="stroke-li-ink"
          />
          {c.cap && (
            <line
              x1={c.x - G.cap / 2}
              x2={c.x + G.cap / 2}
              y1={c.bottom}
              y2={c.bottom}
              strokeWidth={1.5}
              className="stroke-li-ink"
            />
          )}
        </g>
      ))}

      {layout.prs.map((p) => (
        <g key={`${p.id}-${p.core}`} opacity={artifactOpacity(p.id)} className={FADE}>
          <ArtifactGlyph
            kind="pull_request"
            x={p.x}
            y={p.top}
            top={p.top}
            bottom={p.bottom}
            cited={p.cited}
          />
        </g>
      ))}
      {layout.reviews.map((r) => (
        <g key={`${r.id}-${r.x}`} opacity={artifactOpacity(r.id)} className={FADE}>
          <ArtifactGlyph kind="review" x={r.x} y={r.y} cited={false} tick={G.tick} />
        </g>
      ))}
      {layout.issues.map((i) => (
        <g key={`${i.id}-${i.x}`} opacity={artifactOpacity(i.id)} className={FADE}>
          {i.stem && (
            <line
              x1={i.x}
              x2={i.x}
              y1={i.stem.y1}
              y2={i.stem.y2}
              strokeWidth={1.5}
              className="stroke-li-ink"
            />
          )}
          <ArtifactGlyph kind="issue" x={i.x} y={i.y} cited={i.cited} />
        </g>
      ))}
      {layout.commits.map((c) => (
        <g key={`${c.id}-${c.core}`} opacity={artifactOpacity(c.id)} className={FADE}>
          <ArtifactGlyph kind="commit" x={c.x} y={c.y} cited={c.cited} radius={G.commitR} />
        </g>
      ))}
      {layout.hatches.map((h) => (
        <g key={h.id} opacity={artifactOpacity(h.id)} className={FADE}>
          <rect
            x={h.x - G.hatchWidth / 2}
            y={h.top}
            width={G.hatchWidth}
            height={h.height}
            fill={`url(#${hatch})`}
            strokeDasharray="3 3"
            className="stroke-li-gap"
          />
        </g>
      ))}

      {ring && (
        <circle
          cx={ring.x}
          cy={ring.y}
          r={12}
          fill="none"
          strokeWidth={1.5}
          className="stroke-li-steel"
        />
      )}

      <line
        x1={axisX - 50}
        x2={width}
        y1={datumY}
        y2={datumY}
        strokeWidth={2}
        className="stroke-li-datum"
      />
    </svg>
  );
}
