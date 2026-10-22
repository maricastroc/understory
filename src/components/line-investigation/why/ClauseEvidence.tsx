import { anchorQuestion } from "@understory/core/anchor-question";
import type { KeyboardEvent } from "react";
import { useLocale, useMessages } from "@/i18n/LocaleProvider";
import { shownQuestion } from "../../investigator/default-question";
import { dateLine, depthText, displayId, kindName, labelTitle } from "../copy/artifact-copy";
import { gapBasis, gapBody, gapChip, gapTitle } from "../copy/gap-copy";
import { currentCommit, excerpt, hostCommit, provenance, sourceStatus } from "../copy/source-copy";
import { commitRole } from "../copy/subject-copy";
import type { CaseSubject, ClauseSource } from "../copy/types";
import { MiniCore } from "../drawer/MiniCore";
import { QuoteBlock } from "../drawer/QuoteBlock";
import { sourceLinkLabel } from "../drawer/source-link";
import type { InvestigationView, ViewArtifact, ViewClause } from "../model/types";
import { EvidenceLetter } from "../parts/EvidenceLetter";
import { liButton } from "../parts/button-class";
import { standingOf } from "./why-model";

const TONE = {
  evidence: "text-li-evidence-ink",
  neutral: "text-li-text-subtle",
  gap: "text-li-gap-ink",
} as const;

function SourceChip({
  source,
  current,
  onClick,
}: {
  source: ClauseSource;
  current: boolean;
  onClick: () => void;
}) {
  const locale = useLocale();
  const label =
    source.type === "artifact"
      ? `${source.artifact.letter} ${displayId(source.artifact)}`
      : source.type === "gap"
        ? gapChip(source.gap, locale)
        : source.citation;
  return (
    <button
      type="button"
      aria-current={current ? "true" : undefined}
      onClick={onClick}
      className={`cursor-pointer border px-1.5 py-0.5 font-li-mono text-[11px] leading-4 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-li-focus ${
        current
          ? "border-li-ink bg-li-ink text-li-paper"
          : "border-li-divider text-li-ink hover:border-li-ink"
      } ${source.type === "missing" ? "line-through" : ""}`}
    >
      {label}
    </button>
  );
}

function ArtifactBody({
  source,
  clause,
  view,
  subject,
  maxDays,
  onLocate,
  onDrill,
}: {
  source: Extract<ClauseSource, { type: "artifact" }>;
  clause: ViewClause;
  view: InvestigationView;
  subject: CaseSubject;
  maxDays: number;
  onLocate: (id: string) => void;
  onDrill?: (a: ViewArtifact) => void;
}) {
  const locale = useLocale();
  const m = useMessages();
  const a = source.artifact;
  const status = sourceStatus(source, clause, locale);
  const path = provenance(a, view.artifacts, locale);
  const role = commitRole(
    hostCommit(a, view.artifacts),
    currentCommit(view.artifacts),
    subject,
    locale,
  );
  const shown = excerpt(a, source.quote?.range ?? null);
  const fraction = maxDays > 0 && a.daysBeforeNow !== null ? a.daysBeforeNow / maxDays : 0;

  return (
    <div className="grid grid-cols-[28px_minmax(0,1fr)] gap-x-3">
      <div className="flex flex-col items-center gap-1 pt-0.5">
        <MiniCore fraction={fraction} />
      </div>
      <div className="flex min-w-0 flex-col gap-2.5">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-li-mono text-[11px] text-li-text-subtle">
            <EvidenceLetter
              letter={a.letter}
              variant={a.role === "cited" ? "cited" : "supporting"}
            />
            <span className="tracking-[0.05em]">{kindName(a.kind, locale).toUpperCase()}</span>
            <span>{dateLine(a, locale)}</span>
            <span>
              {maxDays > 0
                ? m.caseScreen.depthOf(
                    depthText(a.daysBeforeNow, locale),
                    depthText(maxDays, locale).replace("−", ""),
                  )
                : depthText(a.daysBeforeNow, locale)}
            </span>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-li-mono text-[13px] font-medium text-li-ink">{displayId(a)}</span>
            <span className="text-[15px] leading-[1.35] font-semibold text-li-ink">
              {labelTitle(a, locale)}
            </span>
          </div>
          <p className="font-li-mono text-[11.5px] leading-[1.5] text-li-text-subtle">
            {path.map((step, i) => (
              <span key={step.id}>
                {i > 0 && <span aria-hidden> → </span>}
                {step.relation && <span>{step.relation} </span>}
                <span className="text-li-ink">{step.id}</span>
              </span>
            ))}
            {role && <span> · {role}</span>}
          </p>
        </div>
        <QuoteBlock
          body={shown.body}
          range={shown.range}
          tone={source.quote ? "verified" : "unverified"}
        />
        <p className={`text-[12.5px] font-semibold ${TONE[status.tone]}`}>{status.text}</p>
        {source.quote && standingOf(view.reading, clause.index) === "inferred" && (
          <p
            data-likely-note
            className="-mt-1.5 max-w-140 text-[12.5px] leading-[1.45] text-li-text-subtle"
          >
            {m.why.likelyNote}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onLocate(a.id)}
            className={liButton("secondary", "", "sm")}
          >
            {m.caseScreen.showInHistory}
          </button>
          {a.source.url && (
            <a
              href={a.source.url}
              target="_blank"
              rel="noopener noreferrer"
              className={liButton("ghost", "", "sm")}
            >
              {sourceLinkLabel(a.source.url, locale)} ↗
            </a>
          )}
          {onDrill && (
            <button
              type="button"
              onClick={() => onDrill(a)}
              title={m.caseScreen.opensCase(shownQuestion(anchorQuestion[a.kind], locale))}
              className={liButton("ghost", "", "sm")}
            >
              {m.caseScreen.investigate}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ClauseEvidence({
  id,
  clause,
  sources,
  sourceId,
  view,
  subject,
  maxDays,
  onShow,
  onStep,
  onClose,
  onLocate,
  onDrill,
}: {
  id: string;
  clause: ViewClause;
  sources: ClauseSource[];
  sourceId: string | null;
  view: InvestigationView;
  subject: CaseSubject;
  maxDays: number;
  onShow: (id: string) => void;
  onStep: (delta: 1 | -1) => void;
  onClose: () => void;
  onLocate: (id: string) => void;
  onDrill?: (a: ViewArtifact) => void;
}) {
  const index = Math.max(
    0,
    sources.findIndex((s) => s.id === sourceId),
  );
  const source = sources[index] ?? null;
  const headingId = `${id}-heading`;
  const locale = useLocale();
  const m = useMessages();
  const c = m.caseScreen;

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    if ((e.target as HTMLElement).closest("a")) return;
    e.preventDefault();
    e.stopPropagation();
    onStep(e.key === "ArrowRight" ? 1 : -1);
  };

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      onKeyDown={onKeyDown}
      className="mt-1.5 mb-2 ml-7 flex flex-col gap-3 border-t border-li-divider pt-3"
    >
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <h3
          id={headingId}
          className="font-li-mono text-[11px] font-normal tracking-[0.05em] text-li-text-subtle"
        >
          {c.evidenceOf(clause.index + 1)}
          {sources.length > 1 && ` · ${c.sourceOf(index + 1, sources.length)}`}
        </h3>
        <div role="group" aria-label={c.sourcesOfClause} className="flex flex-wrap gap-1">
          {sources.map((s) => (
            <SourceChip key={s.id} source={s} current={s === source} onClick={() => onShow(s.id)} />
          ))}
        </div>
        <div className="ml-auto flex gap-0.5">
          {sources.length > 1 && (
            <>
              <button
                type="button"
                aria-label={c.previousSource}
                aria-disabled={index === 0}
                onClick={() => onStep(-1)}
                className={liButton("icon", "aria-disabled:opacity-40")}
              >
                ‹
              </button>
              <button
                type="button"
                aria-label={c.nextSource}
                aria-disabled={index === sources.length - 1}
                onClick={() => onStep(1)}
                className={liButton("icon", "aria-disabled:opacity-40")}
              >
                ›
              </button>
            </>
          )}
          <button
            type="button"
            aria-label={c.closeEvidence}
            onClick={onClose}
            className={liButton("icon")}
          >
            ✕
          </button>
        </div>
      </div>

      {!source ? (
        <p className="text-[13px] text-li-text-subtle">{c.noSource}</p>
      ) : source.type === "artifact" ? (
        <ArtifactBody
          source={source}
          clause={clause}
          view={view}
          subject={subject}
          maxDays={maxDays}
          onLocate={onLocate}
          onDrill={onDrill}
        />
      ) : source.type === "gap" ? (
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-col gap-1">
            <span className="font-li-mono text-[11px] text-li-gap-ink">
              {gapChip(source.gap, locale)} · {displayId(source.after)}
            </span>
            <span className="text-[15px] font-semibold text-li-ink">
              {gapTitle(source.gap, locale)}
            </span>
          </div>
          <QuoteBlock
            body={gapBody(source.gap, source.after, locale, !!view.reading)}
            range={null}
            tone={source.gap.verified ? "gap" : "unverified"}
          />
          <p
            className={`text-[12.5px] font-semibold ${TONE[sourceStatus(source, clause, locale).tone]}`}
          >
            {sourceStatus(source, clause, locale).text}
          </p>
          <p className="text-[12.5px] text-li-text-subtle">{gapBasis(source.gap, locale)}</p>
          <div>
            <button
              type="button"
              onClick={() => onLocate(source.after.id)}
              className={liButton("secondary", "", "sm")}
            >
              {c.showInHistory}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <span className="font-li-mono text-[13px] text-li-text-muted line-through">
            {source.citation}
          </span>
          <p className="text-[12.5px] font-semibold text-li-text-subtle">
            {sourceStatus(source, clause, locale).text}
          </p>
          <p className="text-[12.5px] text-li-text-subtle">{c.missingSource}</p>
        </div>
      )}
    </section>
  );
}
