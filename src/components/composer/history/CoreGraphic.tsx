import { AxisBreakMark } from "../../line-investigation/bore/AxisBreakMark";
import { GapHatch } from "../../line-investigation/bore/GapHatch";
import { MAP } from "./map-geometry";
import type { CoreHistory, CoreStatus, MarkView } from "./types";

const FADE = "transition-opacity duration-150 motion-reduce:transition-none";
const MARK_H = 6;

function Mark({ x, mark }: { x: number; mark: MarkView }) {
  const left = x - mark.width / 2;
  const top = mark.y - MARK_H / 2;
  if (mark.tone === "none") {
    return <GapHatch x={x} top={top} height={MARK_H} width={mark.width} />;
  }
  return (
    <rect
      x={left}
      y={top}
      width={mark.width}
      height={MARK_H}
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
  status,
  history,
  opacity,
}: {
  x: number;
  status: CoreStatus;
  history: CoreHistory | null;
  opacity: number;
}) {
  if (status === "mapped" && history) {
    return (
      <g opacity={opacity} className={FADE}>
        <line
          x1={x}
          x2={x}
          y1={MAP.datumY}
          y2={history.bottom}
          strokeWidth={1.5}
          className="stroke-li-ink"
        />
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
      y1={MAP.datumY}
      y2={MAP.datumY + MAP.stub}
      strokeWidth={1.5}
      strokeDasharray="3 3"
      opacity={opacity}
      data-status={status}
      className={`${status === "mapping" ? "stroke-li-steel" : "stroke-li-neutral-500"} ${FADE}`}
    />
  );
}
