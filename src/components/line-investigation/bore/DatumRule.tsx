export function DatumRule({ x1, x2, y }: { x1: number | string; x2: number | string; y: number }) {
  return <line x1={x1} x2={x2} y1={y} y2={y} strokeWidth={2} className="stroke-li-datum" />;
}
