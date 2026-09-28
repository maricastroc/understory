export const BREAK_HALF = 6;

export function ScaleBreakMark({ x, y }: { x: number; y: number }) {
  return (
    <path
      d={`M${x} ${y - BREAK_HALF} L${x + 4} ${y - 3} L${x - 4} ${y + 3} L${x} ${y + BREAK_HALF}`}
      fill="none"
      strokeWidth={1.5}
      strokeLinejoin="round"
      className="stroke-li-ink"
    />
  );
}
