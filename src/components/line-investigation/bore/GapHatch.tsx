import { useId } from "react";

export function GapHatch({
  x,
  top,
  height,
  width = 18,
  verified = true,
}: {
  x: number;
  top: number;
  height: number;
  width?: number;
  verified?: boolean;
}) {
  const pattern = useId();
  return (
    <>
      {verified && (
        <defs>
          <pattern
            id={pattern}
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="6" strokeWidth="1" className="stroke-li-gap" />
          </pattern>
        </defs>
      )}
      <rect
        x={x - width / 2}
        y={top}
        width={width}
        height={height}
        fill={verified ? `url(#${pattern})` : "none"}
        strokeDasharray="3 3"
        className={verified ? "stroke-li-gap" : "stroke-li-unverified"}
      />
    </>
  );
}
