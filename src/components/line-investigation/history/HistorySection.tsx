"use client";

import { type Dispatch, useEffect, useId, useMemo, useRef, useState } from "react";
import { dayDate, displayId, tickText } from "../copy/artifact-copy";
import { gapName } from "../copy/accessible-name";
import { gapBody, gapLetter, gapTitle } from "../copy/gap-copy";
import {
  breakMargin,
  breakText,
  historyTitle,
  originText,
  surfaceText,
} from "../copy/subject-copy";
import type { CaseSubject } from "../copy/types";
import { shortAge } from "../format/age";
import type { InvestigationView, ViewArtifact } from "../model/types";
import { HATCH_BAND } from "../parts/hatch";
import { liButton } from "../parts/button-class";
import { cssEscape, reveal } from "../parts/dom";
import type { CaseAction, CaseState } from "../state/types";
import { BoreCell, BreakMark, Margin, ROW_GRID } from "./HistoryParts";
import { HistoryRow } from "./HistoryRow";
import type { HistoryItem, HistoryModel, HistoryStratum } from "./types";
import { useHistoryPosition } from "./use-history-position";

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

function kinds(strata: HistoryStratum[]): string {
  const count = (k: string) =>
    strata.flatMap((s) => s.members).filter((m) => m.artifact.kind === k).length;
  return [
    [count("commit"), "commit"],
    [count("pull_request"), "PR"],
    [count("review"), "review"],
    [count("issue"), "issue"],
  ]
    .filter(([n]) => (n as number) > 0)
    .map(([n, k]) => plural(n as number, k as string))
    .join(" · ");
}

function span(strata: HistoryStratum[]): string {
  const first = dayDate(strata[0].anchor.date).split(" ").slice(1).join(" ");
  const last = dayDate(strata.at(-1)!.anchor.date).split(" ").slice(1).join(" ");
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
}: {
  model: HistoryModel;
  view: InvestigationView;
  subject: CaseSubject;
  state: CaseState;
  dispatch: Dispatch<CaseAction>;
  onBack: (clause: string | null, source?: string) => void;
  onDrill?: (a: ViewArtifact) => void;
  arrive: boolean;
}) {
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
              {shortAge(item.days)}
              <br />
              {breakMargin(subject, item.first)}
            </Margin>
            <BoreCell line="none">
              <span className="absolute top-0 bottom-0 left-1/2 -ml-[0.75px] border-l-[1.5px] border-li-rule" />
              <BreakMark />
            </BoreCell>
            <div className="flex items-center gap-3 font-li-mono text-[11px] text-li-text-subtle">
              <span>{breakText(subject, item.days, item.first)}</span>
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
                <Margin>{span(item.strata)}</Margin>
                <BoreCell line="dashed" />
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pb-2.5">
                  <span className="text-[14px] text-li-neutral-800">
                    {plural(item.strata.length, "earlier change")} not cited by the answer
                  </span>
                  <span className="font-li-mono text-[11px] text-li-text-subtle">
                    {kinds(item.strata)}
                    {absences > 0 && ` · ${plural(absences, "absence")}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setOpenRuns((s) => new Set(s).add(item.id))}
                    className={liButton("ghost", "", "sm")}
                  >
                    Show {item.strata.length}
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
            />
          ))}
          {silent.map((g) => (
            <div key={g.id} className={`${ROW_GRID} pb-3`}>
              <Margin>
                <span className="text-li-gap-ink">not recorded</span>
              </Margin>
              <BoreCell line="dashed" />
              <div
                role="note"
                aria-label={gapName(g, s.anchor)}
                className="col-span-2 flex flex-col gap-1 border border-dashed border-li-gap px-3 py-2.5 max-[820px]:col-span-1"
                style={{ background: HATCH_BAND }}
              >
                <span className="w-fit bg-li-paper px-1 text-[14px] font-medium text-li-gap-ink">
                  {gapLetter(g)} {gapTitle(g)}
                </span>
                <span className="w-fit max-w-160 bg-li-paper px-1 text-[12.5px] leading-[1.45] text-li-neutral-800">
                  {gapBody(g, s.anchor)}
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
          {historyTitle(subject)}
        </h2>
        <span className="font-li-mono text-[11px] text-li-text-subtle">
          today ±0 → origin {model.originDays !== null ? tickText(model.originDays) : "—"} ·{" "}
          {plural(model.strata.length, "change")} · {plural(count, "artifact")}
        </span>
        {inside && here && (
          <span className="font-li-mono text-[11px] text-li-ink" aria-hidden>
            at {dayDate(here.anchor.date)}
            {here.anchor.daysBeforeNow !== null &&
              ` · ${tickText(here.anchor.daysBeforeNow)}`} · {here.anchor.letter}{" "}
            {displayId(here.anchor)}
          </span>
        )}
        <span className="ml-auto flex flex-wrap items-center gap-2">
          {pinned && (
            <span className="font-li-mono text-[11px] text-li-evidence-ink">
              tracing clause {pinned.index + 1} · {pinned.letters.join(" ")}
            </span>
          )}
          {inside && (
            <button
              type="button"
              onClick={() => onBack(state.pinnedClause)}
              className={liButton("ghost", "", "sm")}
            >
              ↑ {pinned ? `Back to clause ${pinned.index + 1}` : "Back to the answer"}
            </button>
          )}
        </span>
      </div>

      <div className={`${ROW_GRID} mt-4 h-9`}>
        <Margin>
          <span className="text-li-datum-ink">
            today
            <br />
            ±0
          </span>
        </Margin>
        <BoreCell from={14} />
        <div className="col-span-2 flex items-start gap-3 max-[820px]:col-span-1">
          <span className="mt-3 h-0.5 flex-1 bg-li-datum" />
          <span className="mt-1 font-li-mono text-[11px] text-li-datum-ink">
            {surfaceText(subject)}
          </span>
        </div>
      </div>

      <ol aria-label="History, newest first">{renderItems(model.items)}</ol>

      {origin && (
        <div className={`${ROW_GRID} border-t border-li-neutral-300 pt-2`}>
          <Margin>
            origin
            {model.originDays !== null && (
              <>
                <br />
                {tickText(model.originDays)}
              </>
            )}
          </Margin>
          <BoreCell line="none">
            <span className="absolute top-0 left-1/2 -ml-[0.75px] h-2 border-l-[1.5px] border-li-rule" />
            <span className="absolute top-2 left-1/2 size-2.5 -translate-x-1/2 rotate-45 bg-li-ink" />
          </BoreCell>
          <p className="col-span-2 pt-1 font-li-mono text-[11px] text-li-text-subtle max-[820px]:col-span-1">
            {originText(subject)} · {displayId(origin.anchor)}
            {model.originDays !== null && ` · ${shortAge(model.originDays)} deep`}
          </p>
        </div>
      )}

      {model.loose.length > 0 && (
        <div className="mt-8 flex flex-col gap-2">
          <h3 className="text-[13px] font-semibold text-li-ink">
            Also collected, not on the line’s history
          </h3>
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
