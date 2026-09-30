import { artifactName, gapName } from "../../../line-investigation/copy/accessible-name";
import { displayId, labelTitle } from "../../../line-investigation/copy/artifact-copy";
import { gapChip } from "../../../line-investigation/copy/gap-copy";
import type { InvestigationView } from "../../../line-investigation/model/types";
import { currentCaption, marginDate } from "./strata-copy";
import type { StrataLayout, StrataMetrics, Stratum } from "./types";

function Record({
  s,
  m,
  datum,
  active,
  clause,
}: {
  s: Stratum;
  m: StrataMetrics;
  datum: number;
  active: ReadonlySet<string> | null;
  clause: string | null;
}) {
  const wide = m.mode === "wide";
  const sub = s.layer === "sub";
  const cited = !!active?.has(s.artifact.id);
  const quoted = cited && s.quote?.clauseId === clause;
  const knock = wide ? "" : "bg-strata-ground";
  const date = marginDate(s);

  return (
    <span aria-hidden className="flex flex-col items-start">
      {!wide && (
        <span className={`font-li-mono text-[11px] leading-4 ${knock}`} style={{ height: m.date }}>
          <span className="text-strata-ink">{date.date}</span>
          {date.depth && <span className="text-strata-neutral-700"> · {date.depth}</span>}
        </span>
      )}
      <span
        className={`flex items-center gap-2.5 font-li-mono whitespace-nowrap ${knock}`}
        style={{ height: m[s.layer].row }}
      >
        <span
          className={`h-4.5 min-w-5 border border-strata-ink text-center text-[11px] leading-4 ${
            cited ? "bg-strata-ink text-strata-ground" : "text-strata-ink"
          }`}
        >
          {s.artifact.letter}
        </span>
        <span className={`font-medium text-strata-ink ${sub ? "text-[13px]" : "text-sm"}`}>
          {displayId(s.artifact)}
        </span>
        <span
          className={`font-li-body ${sub ? "text-[15px]" : wide ? "text-[17px]" : "text-[15px]"} ${
            cited ? "text-strata-ink" : "text-strata-neutral-800"
          } ${quoted && !sub ? "font-medium" : ""}`}
        >
          {labelTitle(s.artifact)}
        </span>
        {s.version?.note && (
          <span className="text-[11px] text-strata-neutral-700">{s.version.note}</span>
        )}
        {s.gap && (
          <span className="border border-dashed border-strata-neutral-700 px-1.25 text-[11px] leading-4 text-strata-neutral-700">
            {gapChip(s.gap)}
          </span>
        )}
      </span>
      {s.current && (
        <span
          className={`pl-7.5 font-li-mono text-[11px] leading-4 text-strata-neutral-700 ${knock}`}
          style={{ marginTop: m.caption - 16 }}
        >
          {currentCaption(datum)}
        </span>
      )}
      {s.quote && (
        <span
          className={`flex items-baseline gap-2.5 pl-7.5 font-li-mono leading-4.5 ${knock}`}
          style={{ marginTop: m.quote - 18 }}
        >
          <span
            className={`${sub ? "text-xs" : "text-[13px]"} ${
              quoted
                ? "border-b-[1.5px] border-strata-trace text-strata-trace-ink"
                : "text-strata-neutral-700"
            }`}
          >
            “{s.quote.text}”
          </span>
          {quoted && <span className="text-[11px] text-strata-trace-ink">quoted verbatim</span>}
        </span>
      )}
    </span>
  );
}

export function StrataRecords({
  layout,
  m,
  view,
  datum,
  active,
  clause,
}: {
  layout: StrataLayout;
  m: StrataMetrics;
  view: InvestigationView;
  datum: number;
  active: ReadonlySet<string> | null;
  clause: string | null;
}) {
  const byId = new Map(view.artifacts.map((a) => [a.id, a]));
  return (
    <ol aria-label="History, newest first" className="pointer-events-none absolute inset-0">
      {layout.strata.map((s) => (
        <li key={s.artifact.id} className="absolute" style={{ top: s.row - m.date, left: m.codeX }}>
          <span className="sr-only">
            {artifactName(s.artifact, view.clauses)}
            {s.version && `. ${s.version.note ?? "Line read"}: ${s.version.text.trim()}`}
          </span>
          <Record s={s} m={m} datum={datum} active={active} clause={clause} />
        </li>
      ))}
      {view.gaps.flatMap((gap) => {
        const after = byId.get(gap.afterId);
        return after
          ? [
              <li key={gap.id} className="sr-only">
                {gapName(gap, after)}
              </li>,
            ]
          : [];
      })}
    </ol>
  );
}
