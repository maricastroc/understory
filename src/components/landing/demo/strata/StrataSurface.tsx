import { describeLine } from "../../../line-investigation/specimen/describe-line";
import type { CodeSegment, LineRange } from "../../../line-investigation/specimen/types";
import { StrataCode } from "./StrataCode";
import type { StrataMetrics } from "./types";

export function StrataSurface({
  m,
  segments,
  datum,
  token,
  bandEnd,
}: {
  m: StrataMetrics;
  segments: CodeSegment[][];
  datum: number;
  token: LineRange | null;
  bandEnd: number;
}) {
  const wide = m.mode === "wide";
  const { font, line } = m.code;
  const datumTop = m.datumY - line - 2;
  const rows = [datum - 1, datum].filter((n) => n >= 1);
  const bandLeft = wide ? m.codeX - 56 : 0;
  const numberWidth = wide ? 34 : 24;

  return (
    <>
      {wide && (
        <span
          aria-hidden
          className="absolute left-10 font-li-mono text-[11px] leading-[1.35] text-strata-bore-ink"
          style={{ top: m.datumY - 30 }}
        >
          today
          <br />
          ±0
        </span>
      )}
      <span
        aria-hidden
        className="absolute bg-strata-band font-li-mono"
        style={{
          left: bandLeft,
          top: m.datumY - line - 6,
          height: line + 8,
          width: `calc(${m.codeX - bandLeft}px + ${bandEnd}ch)`,
          fontSize: font,
        }}
      />
      <span
        aria-hidden
        className="absolute w-1 bg-strata-bore"
        style={{ left: bandLeft, top: m.datumY - line - 6, height: line + 8 }}
      />
      <span
        aria-hidden
        className={`absolute h-0.75 bg-strata-bore ${wide ? "inset-x-10" : "inset-x-0"}`}
        style={{ top: m.datumY }}
      />
      <ol
        aria-label={`Code, lines ${rows[0]}–${datum}`}
        className="absolute inset-x-0 top-0 font-li-mono"
        style={{ height: m.datumY, fontSize: font, lineHeight: `${line}px` }}
      >
        {rows.map((n) => {
          const isDatum = n === datum;
          return (
            <li
              key={n}
              className={`absolute flex items-baseline ${isDatum ? "font-medium text-strata-ink" : wide ? "text-strata-neutral-600" : "text-strata-neutral-700"}`}
              style={{
                top: isDatum ? datumTop : datumTop - line - 8,
                left: m.codeX - numberWidth - 12,
              }}
            >
              <span
                aria-hidden
                className={`shrink-0 text-right ${isDatum ? "font-semibold text-strata-ink" : "text-strata-neutral-700"}`}
                style={{ width: numberWidth, marginRight: 12, fontSize: wide ? 14 : 11 }}
              >
                {n}
              </span>
              <span className="sr-only">{describeLine(n, isDatum, undefined)}</span>
              <StrataCode
                segments={segments[n - 1] ?? []}
                mark={isDatum ? token : null}
                tone={isDatum ? "datum" : wide ? "context" : "past"}
              />
            </li>
          );
        })}
      </ol>
    </>
  );
}
