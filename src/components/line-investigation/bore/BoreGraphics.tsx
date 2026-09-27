import { useId } from "react";
import { BORE } from "../layout/geometry";
import type { BoreLayout } from "../layout/types";
import type { ViewGap } from "../model/types";
import { ArtifactGlyph } from "./ArtifactGlyph";
import { AxisBreakMark } from "./AxisBreakMark";
import { markCenter } from "./bore-marks";
import type { BoreMark, TraceModel } from "./types";

const FADE = "transition-opacity duration-150 motion-reduce:transition-none";

function Glyph({ mark }: { mark: BoreMark }) {
  return (
    <ArtifactGlyph
      kind={mark.kind}
      x={mark.kind === "review" ? BORE.coreX + 6 : BORE.coreX}
      y={mark.y}
      top={mark.top}
      bottom={mark.bottom}
      cited={mark.cited}
    />
  );
}

export function BoreGraphics({
  layout,
  marks,
  gaps,
  shift,
  datumY,
  inspected,
  trace,
  arrival = null,
}: {
  layout: BoreLayout;
  marks: BoreMark[];
  gaps: Map<string, ViewGap>;
  shift: number;
  datumY: number;
  inspected: string | null;
  trace: TraceModel | null;
  arrival?: Map<string, number> | null;
}) {
  const hatch = useId();
  const leaderFor = new Map(layout.leaders.map((l) => [l.id, l]));
  const coreEnd = Math.max(
    datumY + BORE.firstSegment,
    ...marks.map((m) => m.bottom),
    ...layout.gaps.map((g) => g.top),
  );
  const ringMark = inspected
    ? (marks.find((m) => m.members.includes(inspected) || m.id === inspected) ?? null)
    : null;
  const ringGap = inspected ? layout.gaps.find((g) => g.id === inspected) : undefined;
  const ringY = ringMark ? markCenter(ringMark) : ringGap ? ringGap.anchorY : null;
  const arriving = (id: string) =>
    arrival?.has(id)
      ? {
          className: `${FADE} animate-li-arrive`,
          style: { animationDelay: `${arrival.get(id)}ms` },
        }
      : { className: FADE };

  return (
    <g transform={`translate(${shift} 0)`}>
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
      <line
        x1={BORE.coreX}
        x2={BORE.coreX}
        y1={datumY}
        y2={coreEnd}
        strokeWidth={1.5}
        className="stroke-li-ink"
      />
      {layout.breaks
        .filter((b) => b.strokes)
        .map((b) => (
          <AxisBreakMark key={`break-${b.top}`} x={BORE.coreX} top={b.top} />
        ))}
      {layout.gaps.map((g) => {
        const gap = gaps.get(g.id);
        const verified = gap?.verified === true;
        const leader = leaderFor.get(g.id);
        const host = marks.find((m) => m.id === g.afterId);
        return (
          <g key={g.id} opacity={host && !host.active ? 0.25 : 1} {...arriving(g.id)}>
            <rect
              x={BORE.coreX - 9}
              y={g.top}
              width={18}
              height={g.height}
              fill={verified ? `url(#${hatch})` : "none"}
              strokeDasharray="3 3"
              className={verified ? "stroke-li-gap" : "stroke-li-unverified"}
            />
            {leader && (
              <path
                d={`M${leader.points.map((p) => p.join(" ")).join(" L")}`}
                fill="none"
                strokeDasharray="3 3"
                className={verified ? "stroke-li-gap" : "stroke-li-unverified"}
              />
            )}
          </g>
        );
      })}
      {marks.map((m) => {
        const leader = leaderFor.get(m.id);
        return (
          <g key={m.id} opacity={m.active ? 1 : 0.25} {...arriving(m.id)}>
            <Glyph mark={m} />
            {leader && (
              <path
                d={`M${leader.points.map((p) => p.join(" ")).join(" L")}`}
                fill="none"
                className="stroke-li-neutral-500"
              />
            )}
          </g>
        );
      })}
      {ringY !== null && (
        <circle
          cx={BORE.coreX}
          cy={ringY}
          r={13}
          fill="none"
          strokeWidth={1.5}
          className="stroke-li-steel"
        />
      )}
      {trace && (
        <g opacity={trace.pinned ? 1 : 0.55} className={FADE}>
          <path
            d={trace.path}
            fill="none"
            strokeWidth={2}
            strokeDasharray={trace.silent ? "4 3" : undefined}
            className={trace.silent ? "stroke-li-gap" : "stroke-li-evidence"}
          />
          {trace.dots.map((d) => (
            <circle
              key={`${d.x}-${d.y}`}
              cx={d.x}
              cy={d.y}
              r={3.5}
              className={trace.silent ? "fill-li-gap" : "fill-li-evidence"}
            />
          ))}
        </g>
      )}
    </g>
  );
}
