import { useId } from "react";
import { ArtifactGlyph } from "../../../line-investigation/bore/ArtifactGlyph";
import { AxisBreakMark } from "../../../line-investigation/bore/AxisBreakMark";
import { GapHatch } from "../../../line-investigation/bore/GapHatch";
import { ROOTS_TAIL } from "./roots-variants";
import type { RootsLabel, RootsLayout, RootsNode, RootsVariant } from "./types";

const DRAW_ORDER: Record<RootsNode["kind"], number> = {
  pull_request: 0,
  review: 1,
  issue: 2,
  commit: 3,
};

export function RootsGraphics({
  layout,
  variant,
  labels,
  active,
  trace,
  height,
}: {
  layout: RootsLayout;
  variant: RootsVariant;
  labels: RootsLabel[];
  active: ReadonlySet<string> | null;
  trace: string | null;
  height: number;
}) {
  const ground = `ground-${useId().replace(/:/g, "")}`;
  const dim = (id: string) => active !== null && !active.has(id);
  const top = layout.stem.top;
  const x = variant.stemX;
  const { width: sw, height: sh } = variant.socket;

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-visible"
      width="100%"
      height={height}
    >
      <defs>
        <pattern id={ground} width="9" height="7" patternUnits="userSpaceOnUse">
          <line x1="8" y1="0" x2="2" y2="7" className="stroke-li-neutral-300" />
        </pattern>
      </defs>
      <rect x={0} y={top + 1} width="100%" height={7} fill={`url(#${ground})`} />
      <line x1={0} x2="100%" y1={top} y2={top} strokeWidth={2} className="stroke-li-datum" />

      {variant.mode === "wide" &&
        layout.ticks.map((t) => (
          <line
            key={t.cluster}
            x1={48}
            x2="100%"
            y1={t.y}
            y2={t.y}
            strokeDasharray="2 5"
            className="stroke-li-neutral-300"
          />
        ))}

      {layout.nodes.length > 0 && (
        <>
          <line
            x1={x}
            x2={x}
            y1={top}
            y2={layout.stem.bottom}
            strokeWidth={1.75}
            className="stroke-li-ink"
          />
          <line
            x1={x}
            x2={x}
            y1={layout.stem.bottom}
            y2={layout.stem.bottom + ROOTS_TAIL}
            strokeWidth={1.25}
            strokeDasharray="2 4"
            className="stroke-li-neutral-500"
          />
        </>
      )}
      {layout.breaks
        .filter((b) => b.strokes)
        .map((b) => (
          <AxisBreakMark key={b.top} x={x} top={b.top} />
        ))}

      {layout.nodes
        .filter((n) => n.d)
        .map((n) => (
          <path
            key={`edge-${n.id}`}
            d={n.d}
            fill="none"
            strokeWidth={1.25}
            opacity={dim(n.id) ? 0.3 : 1}
            className="stroke-li-ink"
          />
        ))}

      {layout.sockets.map((s) => (
        <g key={s.id}>
          <path
            d={s.d}
            fill="none"
            strokeDasharray="3 3"
            className={s.gap.verified ? "stroke-li-gap" : "stroke-li-unverified"}
          />
          <GapHatch x={s.x} top={s.y - sh / 2} height={sh} width={sw} verified={s.gap.verified} />
        </g>
      ))}

      {labels
        .filter((l) => l.leader)
        .map((l) => (
          <polyline
            key={`leader-${l.id}`}
            points={l.leader!.map((p) => p.join(",")).join(" ")}
            fill="none"
            opacity={l.kind === "artifact" && dim(l.id) ? 0.3 : 1}
            className="stroke-li-neutral-500"
          />
        ))}

      {trace && (
        <path
          d={trace}
          fill="none"
          strokeWidth={2.25}
          strokeLinejoin="round"
          className="stroke-li-evidence"
        />
      )}

      {[...layout.nodes]
        .sort((a, b) => DRAW_ORDER[a.kind] - DRAW_ORDER[b.kind])
        .map((n) => {
          const cited = n.cited && !dim(n.id);
          return (
            <g key={n.id} opacity={dim(n.id) ? 0.3 : 1}>
              {n.kind === "review" ? (
                <line
                  x1={n.x}
                  x2={n.x}
                  y1={n.y - 7}
                  y2={n.y + 7}
                  strokeWidth={2}
                  className={cited ? "stroke-li-evidence-edge" : "stroke-li-ink"}
                />
              ) : (
                <ArtifactGlyph
                  kind={n.kind}
                  x={n.x}
                  y={n.y}
                  top={n.top}
                  bottom={n.bottom}
                  cited={cited}
                />
              )}
            </g>
          );
        })}
    </svg>
  );
}
