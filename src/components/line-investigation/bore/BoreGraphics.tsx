import { useId } from "react";
import { BORE } from "../layout/geometry";
import type { BoreLayout } from "../layout/types";
import type { ViewGap } from "../model/types";
import { markCenter } from "./bore-marks";
import type { BoreMark, TraceModel } from "./types";

const FADE = "transition-opacity duration-150 motion-reduce:transition-none";

function Glyph({ mark }: { mark: BoreMark }) {
  const x = BORE.coreX;
  const fill = mark.cited ? "fill-li-evidence" : "fill-li-paper";
  if (mark.kind === "commit") {
    return (
      <circle cx={x} cy={mark.y} r={7} strokeWidth={1.5} className={`${fill} stroke-li-ink`} />
    );
  }
  if (mark.kind === "issue") {
    return (
      <rect
        x={x - 6}
        y={mark.y - 6}
        width={12}
        height={12}
        strokeWidth={1.5}
        transform={`rotate(45 ${x} ${mark.y})`}
        className={`${fill} stroke-li-ink`}
      />
    );
  }
  if (mark.kind === "pull_request") {
    return (
      <rect
        x={x - 6}
        y={mark.top}
        width={12}
        height={mark.bottom - mark.top}
        className={
          mark.cited
            ? "fill-li-evidence-tint stroke-li-evidence-edge"
            : "fill-li-paper stroke-li-ink"
        }
      />
    );
  }
  return (
    <line
      x1={x + 6}
      x2={x + 17}
      y1={mark.y}
      y2={mark.y}
      strokeWidth={1.5}
      className="stroke-li-ink"
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
}: {
  layout: BoreLayout;
  marks: BoreMark[];
  gaps: Map<string, ViewGap>;
  shift: number;
  datumY: number;
  inspected: string | null;
  trace: TraceModel | null;
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
          <g key={`break-${b.top}`}>
            <rect
              x={BORE.coreX - 4}
              y={b.top + 14}
              width={8}
              height={10}
              className="fill-li-paper"
            />
            <line
              x1={BORE.coreX - 8}
              y1={b.top + 22}
              x2={BORE.coreX + 8}
              y2={b.top + 14}
              strokeWidth={1.5}
              className="stroke-li-ink"
            />
            <line
              x1={BORE.coreX - 8}
              y1={b.top + 28}
              x2={BORE.coreX + 8}
              y2={b.top + 20}
              strokeWidth={1.5}
              className="stroke-li-ink"
            />
          </g>
        ))}
      {layout.gaps.map((g) => {
        const gap = gaps.get(g.id);
        const verified = gap?.verified === true;
        const leader = leaderFor.get(g.id);
        const host = marks.find((m) => m.id === g.afterId);
        return (
          <g key={g.id} opacity={host && !host.active ? 0.25 : 1} className={FADE}>
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
          <g key={m.id} opacity={m.active ? 1 : 0.25} className={FADE}>
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
