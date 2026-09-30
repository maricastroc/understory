import { shortAge } from "../../../line-investigation/format/age";
import { marginDate } from "./strata-copy";
import { HATCH } from "./strata-hatch";
import { STRATA_COLUMNS } from "./strata-metrics";
import type { StrataLayout, StrataMetrics } from "./types";

export function StrataGround({ layout, m }: { layout: StrataLayout; m: StrataMetrics }) {
  const wide = m.mode === "wide";
  const inset = wide ? "inset-x-10" : "inset-x-0";

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 font-li-mono">
      {layout.strata.map((s) =>
        s.rule === "solid" ? (
          <span
            key={s.artifact.id}
            className={`absolute h-px bg-strata-neutral-300 ${inset}`}
            style={{ top: s.top }}
          />
        ) : s.rule === "dashed" ? (
          <span
            key={s.artifact.id}
            className={`absolute border-t border-dashed border-strata-neutral-300 ${wide ? "right-10" : "right-0"}`}
            style={{ top: s.top, left: wide ? STRATA_COLUMNS.subRule : m.codeX }}
          />
        ) : null,
      )}
      {layout.breaks
        .filter((b) => b.kind === "silent")
        .map((b) => (
          <span
            key={b.top}
            className={`absolute border-y border-dashed border-strata-neutral-600 ${inset}`}
            style={{ top: b.top, height: b.bottom - b.top, background: HATCH.band }}
          />
        ))}
      {wide &&
        layout.strata.map((s) => {
          const { date, depth } = marginDate(s);
          return (
            <span
              key={s.artifact.id}
              className="absolute left-10 w-25 text-[11px] leading-[1.35] text-strata-neutral-700"
              style={{ top: s.row }}
            >
              <span className={s.layer === "main" ? "text-strata-ink" : undefined}>{date}</span>
              {depth && (
                <>
                  <br />
                  {depth}
                </>
              )}
            </span>
          );
        })}
      {wide &&
        layout.breaks.map((b) => (
          <span
            key={b.top}
            className="absolute left-10 bg-strata-ground py-0.5 pr-1 text-[11px] leading-[1.35] text-strata-neutral-700"
            style={{ top: (b.top + b.bottom) / 2 - 15 }}
          >
            {shortAge(b.days)}
            <br />
            {b.kind === "silent" ? "not recorded" : "unchanged"}
          </span>
        ))}
    </div>
  );
}
