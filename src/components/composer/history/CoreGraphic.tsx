import { AxisBreakMark } from "../../line-investigation/bore/AxisBreakMark";
import { GapHatch } from "../../line-investigation/bore/GapHatch";
import { MAP } from "./map-geometry";
import { BREAK_HALF, ScaleBreakMark } from "./ScaleBreakMark";
import type { CoreHistory, CoreStatus, MarkView } from "./types";

const FADE = "transition-opacity duration-150 motion-reduce:transition-none";

function Mark({ x, mark }: { x: number; mark: MarkView }) {
  const left = x - mark.width / 2;
  const top = mark.y - MAP.markHeight / 2;
  if (mark.tone === "none") {
    return <GapHatch x={x} top={top} height={MAP.markHeight} width={mark.width} />;
  }
  return (
    <rect
      x={left}
      y={top}
      width={mark.width}
      height={MAP.markHeight}
      className={
        mark.tone === "found"
          ? "fill-li-evidence-tint stroke-li-evidence-edge"
          : "fill-li-paper stroke-li-neutral-500"
      }
    />
  );
}

export function CoreGraphic({
  x,
  datumY,
  status,
  history,
  opacity,
}: {
  x: number;
  datumY: number;
  status: CoreStatus;
  history: CoreHistory | null;
  opacity: number;
}) {
  if (status === "mapped" && history) {
    return (
      <g opacity={opacity} className={FADE}>
        {history.breakY === null ? (
          <line
            x1={x}
            x2={x}
            y1={datumY}
            y2={history.bottom}
            strokeWidth={2}
            className="stroke-li-ink"
          />
        ) : (
          <>
            <line
              x1={x}
              x2={x}
              y1={datumY}
              y2={history.breakY - BREAK_HALF}
              strokeWidth={2}
              className="stroke-li-ink"
            />
            <ScaleBreakMark x={x} y={history.breakY} />
            <line
              x1={x}
              x2={x}
              y1={history.breakY + BREAK_HALF}
              y2={history.bottom}
              strokeWidth={2}
              className="stroke-li-ink"
            />
          </>
        )}
        {history.marks.map((m) => (
          <Mark key={m.sha} x={x} mark={m} />
        ))}
        {history.cut && <AxisBreakMark x={x} top={history.bottom + 4} />}
      </g>
    );
  }
  return (
    <line
      x1={x}
      x2={x}
      y1={datumY}
      y2={datumY + MAP.stub}
      strokeWidth={2}
      strokeDasharray="3 3"
      opacity={opacity}
      data-status={status}
      className={`${status === "mapping" ? "stroke-li-steel" : "stroke-li-neutral-500"} ${FADE}`}
    />
  );
}
