import type { Dispatch } from "react";
import { dateLine, dayDate, displayId, labelTitle, tickText } from "../copy/artifact-copy";
import { artifactName, gapName } from "../copy/accessible-name";
import { contextLines, metaLine } from "../copy/drawer-copy";
import { gapChip } from "../copy/gap-copy";
import { excerpt } from "../copy/source-copy";
import { QuoteBlock } from "../drawer/QuoteBlock";
import { sourceLinkLabel } from "../drawer/source-link";
import type { InvestigationView, ViewArtifact } from "../model/types";
import { EvidenceLetter } from "../parts/EvidenceLetter";
import { liButton } from "../parts/button-class";
import type { CaseAction } from "../state/types";
import { BoreCell, Glyph, Margin, ROW_GRID } from "./HistoryParts";
import type { HistoryMember, HistoryStratum } from "./types";

function shortDate(a: ViewArtifact, anchor: ViewArtifact): string {
  const full = dayDate(a.date);
  return a.date.slice(0, 4) === anchor.date.slice(0, 4)
    ? full.split(" ").slice(0, 2).join(" ")
    : full;
}

export function HistoryRow({
  member,
  stratum,
  view,
  lit,
  clause,
  opened,
  located,
  line,
  last,
  dispatch,
  onBack,
  onDrill,
}: {
  member: HistoryMember;
  stratum: HistoryStratum;
  view: InvestigationView;
  lit: ReadonlySet<string> | null;
  clause: string | null;
  opened: boolean;
  located: boolean;
  line: string;
  last: boolean;
  dispatch: Dispatch<CaseAction>;
  onBack: (clause: string, source: string) => void;
  onDrill?: (a: ViewArtifact) => void;
}) {
  const a = member.artifact;
  const anchor = member.depth === 0;
  const on = !!lit?.has(a.id);
  const chips = stratum.gaps.filter(
    (g) => g.afterId === a.id && !(g.missing === "pull_request" && g.verified),
  );
  const quotes = a.quotes.filter((q) => q.range !== null);
  const citing = view.clauses.filter((c) => a.citedBy.includes(c.id));
  const detailsId = `history-details-${a.id}`;
  const name = [artifactName(a, view.clauses), ...chips.map((g) => gapName(g, a))].join(". ");
  const shown = opened ? excerpt(a, quotes[0]?.range ?? null) : null;
  const context = opened ? contextLines(a, view.artifacts) : [];
  const meta = opened ? metaLine(a, view.artifacts) : "";

  return (
    <div
      data-artifact={a.id}
      data-lit={on || undefined}
      data-located={located || undefined}
      className={`${ROW_GRID} scroll-mt-40 ${located ? "outline-2 outline-offset-2 outline-li-evidence" : ""}`}
    >
      <Margin strong={anchor}>
        {anchor ? (
          <>
            {dayDate(a.date)}
            {a.daysBeforeNow !== null && (
              <>
                <br />
                <span className="text-li-text-subtle">{tickText(a.daysBeforeNow)}</span>
              </>
            )}
          </>
        ) : (
          shortDate(a, stratum.anchor)
        )}
      </Margin>
      <BoreCell from={anchor && stratum.members[0] === member ? 13 : 0} to={last ? undefined : 0}>
        <Glyph kind={a.kind} cited={a.role === "cited"} dim={lit !== null && !on} />
      </BoreCell>
      <div
        className="flex min-w-0 flex-col gap-1 pb-2.5"
        style={{ paddingLeft: member.depth * 20 }}
      >
        <span className="font-li-mono text-[11px] text-li-text-subtle min-[821px]:hidden">
          {dayDate(a.date)}
          {anchor && a.daysBeforeNow !== null && ` · ${tickText(a.daysBeforeNow)}`}
        </span>
        <button
          type="button"
          aria-expanded={opened}
          aria-controls={opened ? detailsId : undefined}
          aria-label={name}
          onClick={() => dispatch({ type: "open-row", id: a.id })}
          onMouseEnter={() => dispatch({ type: "hover-artifact", id: a.id })}
          onMouseLeave={() => dispatch({ type: "hover-artifact", id: null })}
          className="group flex min-h-6.5 w-fit max-w-full cursor-pointer flex-wrap items-center gap-x-2 gap-y-0.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-li-focus"
        >
          {member.depth > 0 && (
            <span
              aria-hidden
              className="-ml-4 h-3 w-3 self-start border-b border-l border-li-neutral-400"
            />
          )}
          <EvidenceLetter letter={a.letter} variant={on ? "cited" : "supporting"} />
          <span className="font-li-mono text-[12.5px] font-medium text-li-ink">{displayId(a)}</span>
          <span
            className={`text-[14.5px] leading-[1.35] group-hover:underline ${
              a.role === "cited" ? "text-li-ink" : "text-li-neutral-800"
            }`}
          >
            {labelTitle(a)}
          </span>
          {a.kind === "pull_request" && (
            <span className="font-li-mono text-[11px] text-li-text-subtle">{dateLine(a)}</span>
          )}
          {chips.map((g) => (
            <span
              key={g.id}
              className={`border border-dashed px-1 font-li-mono text-[10.5px] leading-4 ${
                g.verified
                  ? "border-li-gap text-li-gap-ink"
                  : "border-li-unverified text-li-text-muted"
              }`}
            >
              {gapChip(g)}
            </span>
          ))}
        </button>
        {anchor && stratum.current && (
          <span className="font-li-mono text-[11px] text-li-text-subtle">
            wrote {line} as it reads today
          </span>
        )}
        {quotes.map((q, i) => {
          const c = view.clauses.find((x) => x.id === q.clauseId);
          const active = q.clauseId === clause;
          return (
            <span
              key={`${q.clauseId}-${i}`}
              className={`flex flex-wrap items-baseline gap-x-2 font-li-mono text-xs leading-[1.5] ${
                active ? "text-li-evidence-ink" : "text-li-text-subtle"
              }`}
            >
              <span className={active ? "border-b-[1.5px] border-li-evidence" : ""}>
                “{q.text}”
              </span>
              {c && <span className="text-[11px]">quoted for clause {c.index + 1}</span>}
            </span>
          );
        })}
        {opened && shown && (
          <div id={detailsId} className="mt-1 flex max-w-170 flex-col gap-2.5">
            <span className="text-xs text-li-text-subtle">
              {[dateLine(a), meta].filter(Boolean).join(" · ")}
            </span>
            <QuoteBlock
              body={shown.body}
              range={shown.range}
              tone={shown.range ? "verified" : "unverified"}
            />
            {context.length > 0 && (
              <ul className="flex flex-col gap-1 text-[12.5px] text-li-neutral-800">
                {context.map((c) => (
                  <li key={c} className="flex gap-1.5">
                    <span aria-hidden className="text-li-text-muted">
                      —
                    </span>
                    {c}
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-2">
              {a.source.url && (
                <a
                  href={a.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={liButton("ghost", "", "sm")}
                >
                  {sourceLinkLabel(a.source.url)} ↗
                </a>
              )}
              {onDrill && (
                <button
                  type="button"
                  onClick={() => onDrill(a)}
                  className={liButton("ghost", "", "sm")}
                >
                  Investigate →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-start justify-end gap-1 pt-1 pl-3 max-[820px]:col-start-2 max-[820px]:justify-start max-[820px]:pb-2.5 max-[820px]:pl-0">
        {citing.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-label={`Back to clause ${c.index + 1} with ${displayId(a)} as its source`}
            onClick={() => onBack(c.id, a.id)}
            className={`cursor-pointer border px-1.5 font-li-mono text-[10.5px] leading-4.5 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-li-focus ${
              c.id === clause
                ? "border-li-evidence-edge bg-li-evidence-tint text-li-evidence-ink"
                : "border-li-divider text-li-text-subtle hover:border-li-ink hover:text-li-ink"
            }`}
          >
            ↑ clause {c.index + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
