import type { ArtifactKind } from "@understory/core/types";
import type { ReactNode } from "react";
import { ArtifactGlyph } from "../bore/ArtifactGlyph";
import { AxisBreakMark } from "../bore/AxisBreakMark";

export const ROW_GRID =
  "grid grid-cols-[112px_36px_minmax(0,1fr)_auto] max-[820px]:grid-cols-[28px_minmax(0,1fr)]";

export function Margin({ children, strong = false }: { children: ReactNode; strong?: boolean }) {
  return (
    <div
      aria-hidden
      className={`pt-1.5 pr-3 font-li-mono text-[11px] leading-[1.4] max-[820px]:hidden ${
        strong ? "text-li-ink" : "text-li-text-subtle"
      }`}
    >
      {children}
    </div>
  );
}

export function BoreCell({
  children,
  line = "solid",
  from = 0,
  to = 0,
}: {
  children?: ReactNode;
  line?: "solid" | "dashed" | "none";
  from?: number;
  to?: number;
}) {
  return (
    <div aria-hidden className="relative">
      {line !== "none" && (
        <span
          className={`absolute left-1/2 -ml-[0.75px] w-0 border-l-[1.5px] border-li-rule ${
            line === "dashed" ? "border-dashed" : ""
          }`}
          style={{ top: from, bottom: to }}
        />
      )}
      {children}
    </div>
  );
}

export function Glyph({ kind, cited, dim }: { kind: ArtifactKind; cited: boolean; dim: boolean }) {
  return (
    <svg
      className={`absolute top-0 left-1/2 -translate-x-1/2 overflow-visible ${dim ? "opacity-45" : ""}`}
      width={36}
      height={26}
    >
      <ArtifactGlyph
        kind={kind}
        x={18}
        y={13}
        top={5}
        bottom={21}
        cited={cited}
        radius={6}
        tick={10}
      />
    </svg>
  );
}

export function BreakMark() {
  return (
    <svg
      className="absolute top-0 left-1/2 -translate-x-1/2 overflow-visible"
      width={36}
      height={40}
    >
      <AxisBreakMark x={18} top={0} />
    </svg>
  );
}
