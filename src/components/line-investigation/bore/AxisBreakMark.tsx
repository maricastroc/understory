export function AxisBreakMark({ x, top }: { x: number; top: number }) {
  return (
    <g>
      <rect x={x - 4} y={top + 14} width={8} height={10} className="fill-li-paper" />
      <line
        x1={x - 8}
        y1={top + 22}
        x2={x + 8}
        y2={top + 14}
        strokeWidth={1.5}
        className="stroke-li-ink"
      />
      <line
        x1={x - 8}
        y1={top + 28}
        x2={x + 8}
        y2={top + 20}
        strokeWidth={1.5}
        className="stroke-li-ink"
      />
    </g>
  );
}
