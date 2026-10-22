"use client";

import { formatMonthYear, shortAge } from "@/i18n/format";
import { useLocale, useMessages } from "@/i18n/LocaleProvider";
import type { Messages } from "@/i18n/messages";
import { type Dispatch, useEffect, useId, useMemo, useRef, useState } from "react";
import { dayDate, displayId, tickText } from "../copy/artifact-copy";
import { gapName } from "../copy/accessible-name";
import { gapBody, gapLetter, gapTitle } from "../copy/gap-copy";
import { earlierCaption, edgeText, factText } from "../copy/reading-copy";
import {
  breakMargin,
  breakText,
  historyTitle,
  originText,
  surfaceText,
} from "../copy/subject-copy";
import type { CaseSubject } from "../copy/types";
import type { InvestigationView, ViewArtifact } from "../model/types";
import { HATCH_BAND } from "../parts/hatch";
import { liButton } from "../parts/button-class";
import { cssEscape, reveal } from "../parts/dom";
import type { CaseAction, CaseState } from "../state/types";
import { BoreCell, BreakMark, Glyph, Margin, ROW_GRID } from "./HistoryParts";
import { HistoryRow } from "./HistoryRow";
import { extentOf, type ReadingLayer } from "./reading-layer";
import type { HistoryItem, HistoryModel, HistoryStratum } from "./types";
import { useHistoryPosition } from "./use-history-position";

const KINDS = ["commit", "pull_request", "review", "issue"] as const;

function kinds(strata: HistoryStratum[], m: Messages): string {
  const members = strata.flatMap((s) => s.members);
  return KINDS.map((k) => [k, members.filter((x) => x.artifact.kind === k).length] as const)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => m.history.count[k](n))
    .join(" · ");
}

function span(strata: HistoryStratum[], m: Messages): string {
  const first = formatMonthYear(m.time, strata[0].anchor.date);
  const last = formatMonthYear(m.time, strata.at(-1)!.anchor.date);
  return first === last ? first : `${first} – ${last}`;
}

export function HistorySection({
  model,
  view,
  subject,
  state,
  dispatch,
  onBack,
  onDrill,
  arrive,
  layer,
}: {
  layer?: ReadingLayer | null;
  model: HistoryModel;
  view: InvestigationView;
  subject: CaseSubject;
  state: CaseState;
  dispatch: Dispatch<CaseAction>;
  onBack: (clause: string | null, source?: string) => void;
  onDrill?: (a: ViewArtifact) => void;
  arrive: boolean;
}) {
  const locale = useLocale();
  const m = useMessages();
  const h = m.history;
  const headingId = useId();
  const section = useRef<HTMLElement | null>(null);
  const bar = useRef<HTMLDivElement | null>(null);
  const { inside, at } = useHistoryPosition(section, bar);
  const [openRuns, setOpenRuns] = useState<Set<string>>(new Set());
  const effective = state.hoverClause ?? state.pinnedClause;
  const clause = view.clauses.find((c) => c.id === effective) ?? null;
  const lit = useMemo(() => (clause ? new Set(clause.citations) : null), [clause]);
  const pinned = view.clauses.find((c) => c.id === state.pinnedClause) ?? null;
  const byStratum = useMemo(() => new Map(model.strata.map((s) => [s.id, s])), [model.strata]);
  const here = at ? byStratum.get(at) : undefined;
  const count = model.strata.reduce((n, s) => n + s.members.length, 0) + model.loose.length;
  const edge = layer ? edgeText(layer.edge, layer.history, locale) : null;
  const extent = extentOf(layer, model.strata.length, model.originDays);
  const open = layer?.history === "the line" && edge !== null;

  const forced = useMemo(() => {
    const wanted = new Set<string>([...(lit ?? []), ...(state.located ? [state.located] : [])]);
    const out = new Set<string>();
    for (const item of model.items) {
      if (item.type !== "run") continue;
      if (item.strata.some((s) => s.members.some((m) => wanted.has(m.artifact.id))))
        out.add(item.id);
    }
    return out;
  }, [model.items, lit, state.located]);

  useEffect(() => {
    if (!state.located) return;
    const el = section.current?.querySelector<HTMLElement>(
      `[data-artifact="${cssEscape(state.located)}"]`,
    );
    reveal(el, "center");
    el?.querySelector<HTMLElement>("button[aria-expanded]")?.focus({ preventScroll: true });
    const t = window.setTimeout(() => dispatch({ type: "settle-locate" }), 1800);
    return () => window.clearTimeout(t);
  }, [state.located, dispatch]);

  const renderItems = (items: HistoryItem[]) =>
    items.map((item) => {
      if (item.type === "break") {
        return (
          <li key={item.id} className={`${ROW_GRID} h-10`}>
            <Margin>
              {shortAge(m.time, item.days)}
              <br />
              {breakMargin(subject, item.first, locale)}
            </Margin>
            <BoreCell line="none">
              <span className="absolute top-0 bottom-0 left-1/2 -ml-[0.75px] border-l-[1.5px] border-li-rule" />
              <BreakMark />
            </BoreCell>
            <div className="flex items-center gap-3 font-li-mono text-[11px] text-li-text-subtle">
              <span>{breakText(subject, item.days, item.first, locale)}</span>
              <span
                aria-hidden
                className="h-0 flex-1 border-t border-dashed border-li-neutral-300"
              />
            </div>
          </li>
        );
      }
      if (item.type === "run") {
        const open = openRuns.has(item.id) || forced.has(item.id);
        const absences = item.strata.reduce((n, s) => n + s.gaps.length, 0);
        return (
          <li key={item.id}>
            {open ? (
              <ol>{renderItems(item.items)}</ol>
            ) : (
              <div className={`${ROW_GRID} min-h-14`}>
                <Margin>{span(item.strata, m)}</Margin>
                <BoreCell line="dashed" />
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pb-2.5">
                  <span className="text-[14px] text-li-neutral-800">
                    {h.quiet(item.strata.length)}
                  </span>
                  <span className="font-li-mono text-[11px] text-li-text-subtle">
                    {kinds(item.strata, m)}
                    {absences > 0 && ` · ${h.absences(absences)}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setOpenRuns((s) => new Set(s).add(item.id))}
                    className={liButton("ghost", "", "sm")}
                  >
                    {h.show(item.strata.length)}
                  </button>
                </div>
              </div>
            )}
          </li>
        );
      }
      const s = item.stratum;
      const delay = arrive ? { animationDelay: `${Math.min(item.index, 12) * 45}ms` } : undefined;
      const silent = s.gaps.filter((g) => g.missing === "pull_request" && g.verified);
      return (
        <li
          key={s.id}
          data-stratum={s.id}
          className={`border-t border-li-neutral-300 pt-2 ${arrive ? "animate-li-arrive" : ""}`}
          style={delay}
        >
          {s.members.map((m, i) => (
            <HistoryRow
              key={m.artifact.id}
              member={m}
              stratum={s}
              view={view}
              lit={lit}
              clause={effective}
              opened={state.opened === m.artifact.id}
              located={state.located === m.artifact.id}
              subject={subject}
              last={i === s.members.length - 1}
              dispatch={dispatch}
              onBack={onBack}
              onDrill={onDrill}
              layer={layer}
            />
          ))}
          {silent.map((g) => (
            <div key={g.id} className={`${ROW_GRID} pb-3`}>
              <Margin>
                <span className="text-li-gap-ink">{m.gap.notRecorded}</span>
              </Margin>
              <BoreCell line="dashed" />
              <div
                role="note"
                aria-label={gapName(g, s.anchor, locale)}
                className="col-span-2 flex flex-col gap-1 border border-dashed border-li-gap px-3 py-2.5 max-[820px]:col-span-1"
                style={{ background: HATCH_BAND }}
              >
                <span className="w-fit bg-li-paper px-1 text-[14px] font-medium text-li-gap-ink">
                  {gapLetter(g)} {gapTitle(g, locale)}
                </span>
                <span className="w-fit max-w-160 bg-li-paper px-1 text-[12.5px] leading-[1.45] text-li-neutral-800">
                  {gapBody(g, s.anchor, locale, !!layer)}
                </span>
              </div>
            </div>
          ))}
        </li>
      );
    });

  const origin = model.strata.at(-1);

  return (
    <section
      id="history"
      ref={section}
      aria-labelledby={headingId}
      className="flex scroll-mt-14 flex-col"
    >
      <div
        ref={bar}
        className="sticky top-14 z-20 flex flex-wrap items-center gap-x-4 gap-y-1 border-y border-li-divider bg-li-paper py-2.5"
      >
        <h2 id={headingId} className="text-[13px] font-semibold text-li-ink">
          {historyTitle(subject, locale)}
        </h2>
        <span className="font-li-mono text-[11px] text-li-text-subtle">
          {h.extent(
            open ? h.oldestRead : h.origin,
            extent.days !== null ? tickText(extent.days, locale) : "—",
            h.changes(extent.changes),
            m.caseScreen.artifacts(count),
          )}
        </span>
        {inside && here && (
          <span className="font-li-mono text-[11px] text-li-ink" aria-hidden>
            {h.at(dayDate(here.anchor.date, locale))}
            {here.anchor.daysBeforeNow !== null &&
              ` · ${tickText(here.anchor.daysBeforeNow, locale)}`}{" "}
            · {here.anchor.letter} {displayId(here.anchor)}
          </span>
        )}
        <span className="ml-auto flex flex-wrap items-center gap-2">
          {pinned && (
            <span className="font-li-mono text-[11px] text-li-evidence-ink">
              {h.tracing(pinned.index + 1, pinned.letters.join(" "))}
            </span>
          )}
          {inside && (
            <button
              type="button"
              onClick={() => onBack(state.pinnedClause)}
              className={liButton("ghost", "", "sm")}
            >
              ↑ {pinned ? h.backToClause(pinned.index + 1) : h.backToAnswer}
            </button>
          )}
        </span>
      </div>

      <div className={`${ROW_GRID} mt-4 h-9`}>
        <Margin>
          <span className="text-li-datum-ink">
            {m.subject.today}
            <br />
            ±0
          </span>
        </Margin>
        <BoreCell from={14} />
        <div className="col-span-2 flex items-start gap-3 max-[820px]:col-span-1">
          <span className="mt-3 h-0.5 flex-1 bg-li-datum" />
          <span className="mt-1 font-li-mono text-[11px] text-li-datum-ink">
            {surfaceText(subject, locale)}
          </span>
        </div>
      </div>

      <ol aria-label={h.newestFirst}>{renderItems(model.items)}</ol>

      {layer && layer.earlier.length > 0 && (
        <ol aria-label={h.earlierList}>
          {layer.earlier.map((entry) => (
            <li
              key={entry.id}
              data-earlier={entry.id}
              className={`${ROW_GRID} border-t border-li-neutral-300 pt-2`}
            >
              <Margin>{dayDate(entry.date, locale)}</Margin>
              <BoreCell line="dashed">
                <Glyph kind="commit" cited={false} dim />
              </BoreCell>
              <div className="col-span-2 flex min-w-0 flex-col gap-1 pb-2.5 max-[820px]:col-span-1">
                <span className="font-li-mono text-[11px] text-li-text-subtle min-[821px]:hidden">
                  {dayDate(entry.date, locale)}
                </span>
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-li-mono text-[12.5px] font-medium text-li-ink">
                    {entry.id.replace("commit:", "")}
                  </span>
                  <span className="text-[14.5px] leading-[1.35] text-li-neutral-800">
                    {entry.title}
                  </span>
                </span>
                {entry.did && (
                  <span className="font-li-mono text-[11px] text-li-datum-ink">
                    {factText({ did: entry.did, before: entry.before ?? null }, locale)}
                    {entry.did === "rewrote" && entry.before && (
                      <>
                        {` · ${h.before} `}
                        <code className="text-li-neutral-800">{entry.before}</code>
                      </>
                    )}
                  </span>
                )}
                <span className="font-li-mono text-[11px] text-li-text-subtle">
                  {earlierCaption(locale)}
                </span>
                {entry.message && entry.message.trim() !== entry.title.trim() && (
                  <details className="max-w-170 text-[12.5px] text-li-neutral-800">
                    <summary className="w-fit cursor-pointer font-li-mono text-[11px] text-li-text-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-li-focus">
                      {h.commitMessage}
                    </summary>
                    <pre className="mt-1 font-li-mono text-[11.5px] leading-[1.5] whitespace-pre-wrap">
                      {entry.message}
                    </pre>
                  </details>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      {edge && (
        <p
          role="note"
          data-edge
          className={`${ROW_GRID} border-t border-dashed border-li-neutral-300 pt-2 pb-2`}
        >
          <span className="col-span-2 max-[820px]:hidden" />
          <span className="col-span-2 font-li-mono text-[11px] text-li-text-subtle max-[820px]:col-span-2">
            {edge}
          </span>
        </p>
      )}

      {origin && !(layer && (layer.earlier.length > 0 || edge !== null)) && (
        <div className={`${ROW_GRID} border-t border-li-neutral-300 pt-2`}>
          <Margin>
            {h.origin}
            {model.originDays !== null && (
              <>
                <br />
                {tickText(model.originDays, locale)}
              </>
            )}
          </Margin>
          <BoreCell line="none">
            <span className="absolute top-0 left-1/2 -ml-[0.75px] h-2 border-l-[1.5px] border-li-rule" />
            <span className="absolute top-2 left-1/2 size-2.5 -translate-x-1/2 rotate-45 bg-li-ink" />
          </BoreCell>
          <p className="col-span-2 pt-1 font-li-mono text-[11px] text-li-text-subtle max-[820px]:col-span-1">
            {originText(subject, locale)} · {displayId(origin.anchor)}
            {model.originDays !== null && ` · ${h.deep(shortAge(m.time, model.originDays))}`}
          </p>
        </div>
      )}

      {model.loose.length > 0 && (
        <div className="mt-8 flex flex-col gap-2">
          <h3 className="text-[13px] font-semibold text-li-ink">{h.alsoCollected}</h3>
          <ul className="flex flex-col gap-1.5">
            {model.loose.map((a) => (
              <li
                key={a.id}
                data-artifact={a.id}
                className="flex flex-wrap items-center gap-2 text-[13.5px]"
              >
                <span className="font-li-mono text-[12px] text-li-ink">
                  {a.letter} {displayId(a)}
                </span>
                <span className="text-li-neutral-800">{a.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
