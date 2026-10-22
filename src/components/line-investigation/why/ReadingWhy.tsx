import type { Passage } from "@understory/core/types";
import { type KeyboardEvent, type ReactNode, useEffect, useRef } from "react";
import { useLocale, useMessages } from "@/i18n/LocaleProvider";
import {
  type SourceName,
  changeText,
  contextText,
  notEstablishedText,
  passageWhere,
  qualityText,
  standingText,
  titledText,
} from "../copy/why-copy";
import { clauseId } from "../model/clause-id";
import type { ViewClause } from "../model/types";
import type { WhyEntry, WhyModel } from "./why-model";

const HOVER_DELAY = 120;
const LEAVE_DELAY = 160;

const FOCUS =
  "cursor-pointer rounded-[3px] text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-li-focus motion-reduce:transition-none";

type Mark = "documented" | "likely" | "context" | "unsustained";

function Glyph({ mark }: { mark: Mark }) {
  const ring =
    mark === "documented"
      ? "border-li-evidence-ink bg-li-evidence"
      : mark === "likely"
        ? "border-li-evidence-ink"
        : mark === "context"
          ? "border-li-neutral-400"
          : "border-dashed border-li-gap";
  return (
    <span
      aria-hidden
      className={`pointer-events-none mt-1.5 ml-1 size-3 shrink-0 rounded-full border-[1.5px] ${ring}`}
    />
  );
}

function Quotes({ passages, source }: { passages: Passage[]; source: (id: string) => SourceName }) {
  const locale = useLocale();
  if (passages.length === 0) return null;
  return (
    <ul className="flex flex-col gap-0.5 pr-2 pb-1 pl-7.5">
      {passages.map((passage, i) => (
        <li
          key={`${passage.source}-${i}`}
          className="line-clamp-2 font-li-mono text-xs leading-[1.5] text-li-text-subtle"
        >
          <span className="text-li-neutral-800">
            {passageWhere(source(passage.source), passage, locale)}
          </span>{" "}
          “{passage.text}”
        </li>
      ))}
    </ul>
  );
}

export function ReadingWhy({
  model,
  language,
  clauses,
  source,
  effective,
  pinned,
  onHover,
  onPick,
  evidenceId,
  renderEvidence,
}: {
  model: WhyModel;
  language: string | null;
  clauses: ViewClause[];
  source: (id: string) => SourceName;
  effective: string | null;
  pinned: string | null;
  onHover: (id: string | null) => void;
  onPick: (id: string) => void;
  evidenceId: string;
  renderEvidence?: (clause: ViewClause, id: string) => ReactNode;
}) {
  const locale = useLocale();
  const m = useMessages();
  const root = useRef<HTMLDivElement>(null);
  const intent = useRef<number | undefined>(undefined);
  const later = (fn: () => void, ms: number) => {
    window.clearTimeout(intent.current);
    intent.current = window.setTimeout(fn, ms);
  };
  useEffect(() => () => window.clearTimeout(intent.current), []);
  const carried = new Set(
    model.changes.flatMap((change) =>
      change.entries.flatMap((entry) => (entry.standing ? [entry.claim] : [])),
    ),
  );

  const move = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    e.stopPropagation();
    const rows = [...(root.current?.querySelectorAll<HTMLButtonElement>("[data-why-row]") ?? [])];
    const at = rows.indexOf(e.currentTarget);
    const next =
      rows[Math.min(rows.length - 1, Math.max(0, at + (e.key === "ArrowDown" ? 1 : -1)))];
    next?.focus();
  };

  const row = (
    key: string,
    claim: number,
    mark: Mark,
    label: string,
    sentence: string | null,
    after: ReactNode,
  ) => {
    const id = clauseId(claim);
    const clause = clauses.find((c) => c.id === id);
    const isPinned = pinned === id;
    const surface = isPinned
      ? mark === "unsustained"
        ? "bg-li-neutral-200 shadow-[inset_3px_0_0_var(--color-li-gap)]"
        : "bg-li-neutral-200 shadow-[inset_3px_0_0_var(--color-li-evidence)]"
      : effective === id
        ? "bg-li-neutral-200"
        : "";
    return (
      <li key={key} data-clause={id}>
        <button
          type="button"
          data-why-row
          aria-expanded={isPinned}
          aria-controls={isPinned ? `${evidenceId}-${id}` : undefined}
          onMouseEnter={() => later(() => onHover(id), HOVER_DELAY)}
          onMouseLeave={() => later(() => onHover(null), LEAVE_DELAY)}
          onFocus={() => {
            window.clearTimeout(intent.current);
            onHover(id);
          }}
          onBlur={() => later(() => onHover(null), 0)}
          onClick={() => onPick(id)}
          onKeyDown={move}
          className={`grid w-full grid-cols-[22px_minmax(0,1fr)] items-start gap-x-2 py-1.5 pr-2 pl-1 ${FOCUS} ${surface}`}
        >
          <Glyph mark={mark} />
          <span className="flex min-w-0 flex-col gap-1">
            {sentence && (
              <span
                lang={language ?? undefined}
                className={
                  mark === "unsustained"
                    ? "text-[15px] leading-[1.45] text-li-neutral-800"
                    : "text-[17px] leading-[1.42] text-li-ink"
                }
              >
                {sentence}
              </span>
            )}
            <span
              className={`text-[11.5px] ${
                mark === "documented"
                  ? "text-li-datum-ink"
                  : mark === "unsustained"
                    ? "text-li-gap-ink"
                    : "text-li-neutral-800"
              }`}
            >
              {m.why.sentenceOf(label, claim + 1)}
            </span>
          </span>
        </button>
        {after}
        {isPinned && clause && renderEvidence
          ? renderEvidence(clause, `${evidenceId}-${id}`)
          : null}
      </li>
    );
  };

  const entryRow = (changeId: string, entry: WhyEntry, i: number) =>
    row(
      `${changeId}-${entry.claim}-${i}`,
      entry.claim,
      entry.standing === "documented for the line"
        ? "documented"
        : entry.standing === "inferred"
          ? "likely"
          : "context",
      entry.standing
        ? standingText(entry.standing, locale)
        : contextText(carried.has(entry.claim), locale),
      entry.sentence,
      <Quotes passages={entry.passages} source={source} />,
    );

  return (
    <div ref={root} className="mt-1 flex flex-col gap-3">
      {model.explanation === "not identified" && (
        <p className="pl-7 text-base text-li-ink">{m.why.notIdentified}</p>
      )}
      {model.changes.length > 0 && (
        <ol aria-label={m.why.changes} className="flex flex-col gap-3">
          {model.changes.map((change) => (
            <li key={change.id} data-why-change={change.last ? "last" : "earlier"}>
              <p className="pl-7 font-li-mono text-[11px] text-li-text-subtle">
                <span className={change.last ? "text-li-ink" : undefined}>
                  {changeText(change, locale)}
                </span>
                {model.explanation === "not identified" && (
                  <span className="block text-li-neutral-800">
                    {titledText(change.title, locale)}
                  </span>
                )}
              </p>
              {change.entries.length > 0 && (
                <ul className="mt-1 flex flex-col gap-1">
                  {change.entries.map((entry, i) => entryRow(change.id, entry, i))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      )}
      {model.unsustained.length > 0 && (
        <details className="group">
          <summary className="w-fit cursor-pointer pl-7 text-xs text-li-gap-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-li-focus">
            {notEstablishedText(model.unsustained.length, locale)}
          </summary>
          <ul className="mt-1 flex flex-col gap-1">
            {model.unsustained.map((u) =>
              row(
                `unsustained-${u.claim}`,
                u.claim,
                "unsustained",
                qualityText(u.quality, locale),
                u.text,
                null,
              ),
            )}
          </ul>
        </details>
      )}
    </div>
  );
}
