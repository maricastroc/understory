import type { PrSectionLayout } from "../layout/types";
import type { PrView } from "../model/types";

export function SectionAxis({ view, layout }: { view: PrView; layout: PrSectionLayout }) {
  const { datumY, axisX } = layout;
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute w-10.5 text-right font-li-mono text-[9.5px] leading-[1.1] text-li-datum-ink"
        style={{ left: axisX - 50, top: datumY - 21 }}
      >
        ±0
        <br />
        {view.datum.label}
      </div>
      {layout.labels.map((l) => (
        <div
          key={`${l.kind}-${l.y}`}
          aria-hidden
          className="pointer-events-none absolute w-10 text-right font-li-mono text-[9.5px] leading-[1.2] whitespace-pre text-li-text-subtle"
          style={{ left: axisX - 54, top: l.kind === "tick" ? l.y - 6 : l.y }}
        >
          {l.text}
        </div>
      ))}
    </>
  );
}
