import type { ArtifactKind } from "@git-investigator/core/types";

export function ArtifactGlyph({
  kind,
  x,
  y,
  top = y,
  bottom = y,
  cited,
  radius = 7,
  tick = 11,
}: {
  kind: ArtifactKind;
  x: number;
  y: number;
  top?: number;
  bottom?: number;
  cited: boolean;
  radius?: number;
  tick?: number;
}) {
  const fill = cited ? "fill-li-evidence" : "fill-li-paper";
  if (kind === "commit") {
    return (
      <circle cx={x} cy={y} r={radius} strokeWidth={1.5} className={`${fill} stroke-li-ink`} />
    );
  }
  if (kind === "issue") {
    return (
      <rect
        x={x - 6}
        y={y - 6}
        width={12}
        height={12}
        strokeWidth={1.5}
        transform={`rotate(45 ${x} ${y})`}
        className={`${fill} stroke-li-ink`}
      />
    );
  }
  if (kind === "pull_request") {
    return (
      <rect
        x={x - 6}
        y={top}
        width={12}
        height={bottom - top}
        className={
          cited ? "fill-li-evidence-tint stroke-li-evidence-edge" : "fill-li-paper stroke-li-ink"
        }
      />
    );
  }
  return <line x1={x} x2={x + tick} y1={y} y2={y} strokeWidth={1.5} className="stroke-li-ink" />;
}
