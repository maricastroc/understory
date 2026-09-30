import { tickText } from "../../../line-investigation/copy/artifact-copy";
import { shortAge } from "../../../line-investigation/format/age";
import type { RootsLane, RootsLayout, RootsVariant } from "./types";

const HEADERS: Array<[RootsLane | "commit", string]> = [
  ["issue", "issues"],
  ["commit", "the line's commits"],
  ["pull_request", "pull requests"],
  ["review", "reviews"],
];

export function RootsNotes({
  layout,
  variant,
  datum,
}: {
  layout: RootsLayout;
  variant: RootsVariant;
  datum: number;
}) {
  const wide = variant.mode === "wide";
  const ground = layout.stem.top;
  const first = layout.breaks.find((b) => b.kind === "first");

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 font-li-mono text-li-text-subtle"
    >
      <span
        className="absolute right-0 text-[10.5px] text-li-datum-ink"
        style={{ top: wide ? ground - 18 : ground + 12 }}
      >
        ±0 · line {datum} today
      </span>
      {wide &&
        HEADERS.map(([lane, label]) => (
          <span
            key={lane}
            className="absolute -translate-x-1/2 bg-li-paper px-1 text-[10px] tracking-[0.06em] whitespace-nowrap uppercase"
            style={{
              top: ground + 12,
              left: lane === "commit" ? variant.stemX : variant.lanes[lane],
            }}
          >
            {label}
          </span>
        ))}
      {first?.strokes && (
        <span
          className={`absolute text-[10.5px] whitespace-nowrap ${wide ? "-translate-x-full" : ""}`}
          style={{
            top: first.top + first.height / 2 - 7,
            left: wide ? variant.stemX - 14 : variant.stemX + 12,
          }}
        >
          unchanged for {shortAge(first.days)}
        </span>
      )}
      {layout.breaks
        .filter((b) => b.kind === "gap")
        .map((b) => (
          <span
            key={b.top}
            className="absolute w-12 -translate-x-full text-right text-[9.5px] leading-[1.2]"
            style={{ top: b.top + 10, left: variant.stemX - (wide ? 14 : 10) }}
          >
            {shortAge(b.days)}
            <br />
            gap
          </span>
        ))}
      {layout.ticks.map((t) => (
        <span
          key={t.cluster}
          className={`absolute ${wide ? "text-[10.5px]" : "w-8 text-right text-[9.5px]"}`}
          style={{ top: t.y - 7, left: 0 }}
        >
          {tickText(t.days)}
        </span>
      ))}
    </div>
  );
}
