import { useId, useRef } from "react";
import type { CaseSubject } from "../copy/types";
import type { InvestigationView } from "../model/types";
import type { CasePhase } from "./types";
import { liButton } from "../parts/button-class";
import { VerdictButton } from "../verdict/VerdictButton";
import { VerdictPopover } from "../verdict/VerdictPopover";

function Anchor({ view, subject }: { view: InvestigationView; subject: CaseSubject }) {
  if (subject.kind !== "anchor") return null;
  return (
    <div className="flex shrink-0 items-center gap-1.5 font-li-mono text-xs text-li-text-subtle">
      <span>anchored on{subject.artifact === "commit" ? " commit" : ""}</span>
      <span className="bg-li-datum-strong px-1.5 py-px text-li-ink">{subject.ref}</span>
      {view.repo.branch && <span className="ml-2 whitespace-nowrap">on {view.repo.branch}</span>}
    </div>
  );
}

function Location({ view, reserve }: { view: InvestigationView; reserve: boolean }) {
  const loc = view.location;
  if (!loc) return null;
  const slash = loc.file.lastIndexOf("/");
  const dir = slash >= 0 ? loc.file.slice(0, slash + 1) : "";
  const file = loc.file.slice(slash + 1);
  const line =
    loc.startLine === loc.endLine ? `:${loc.startLine}` : `:${loc.startLine}–${loc.endLine}`;
  return (
    <div className="flex shrink-0 items-center gap-1.5 font-li-mono text-xs text-li-text-subtle">
      {dir && <span>{dir}</span>}
      <span className="text-li-ink">{file}</span>
      <span className="bg-li-datum-strong px-1.5 py-px text-li-ink">{line}</span>
      {view.pinnedSha ? (
        <span className="ml-2 whitespace-nowrap">blame @ {view.pinnedSha.slice(0, 7)}</span>
      ) : (
        reserve && (
          <span aria-hidden className="invisible ml-2 whitespace-nowrap">
            blame @ 0000000
          </span>
        )
      )}
    </div>
  );
}

export function TitleRow({
  view,
  subject,
  verdictOpen,
  onToggleVerdict,
  onCloseVerdict,
  onFollowUp,
  onBackToQuestion,
  phase,
}: {
  view: InvestigationView;
  subject?: CaseSubject;
  verdictOpen: boolean;
  onToggleVerdict: () => void;
  onCloseVerdict: () => void;
  onFollowUp?: () => void;
  onBackToQuestion?: () => void;
  phase?: CasePhase;
}) {
  const popoverId = useId();
  const anchor = useRef<HTMLDivElement>(null);
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 max-[820px]:flex-col max-[820px]:items-start">
      <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-4 gap-y-1.5">
        <h1
          title={view.question}
          className="max-w-full min-w-0 truncate font-li-body text-[32px] leading-[1.1] font-semibold tracking-[-0.02em] text-li-ink max-[820px]:line-clamp-2 max-[820px]:text-2xl max-[820px]:whitespace-normal"
        >
          {view.question}
        </h1>
        <Location view={view} reserve={!!phase} />
        {subject && <Anchor view={view} subject={subject} />}
      </div>
      {phase ? (
        <div className="flex items-center gap-2">
          <span className="grid rounded-[3px] border border-li-divider py-1.25 pr-2.5 pl-2 text-[13px] font-semibold whitespace-nowrap text-li-text-subtle">
            <span className="col-start-1 row-start-1">
              {phase === "collecting" ? "Collecting" : "Failed"}
            </span>
            <span aria-hidden className="invisible col-start-1 row-start-1">
              Reconstructing… ▾
            </span>
          </span>
          <span aria-hidden className={liButton("secondary", "invisible")}>
            Follow up in this file
          </span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <div ref={anchor} className="relative">
            <VerdictButton
              verdict={view.verdict}
              open={verdictOpen}
              controls={popoverId}
              onToggle={onToggleVerdict}
            />
            {verdictOpen && (
              <VerdictPopover id={popoverId} view={view} onClose={onCloseVerdict} anchor={anchor} />
            )}
          </div>
          {onBackToQuestion && (
            <button type="button" onClick={onBackToQuestion} className={liButton("ghost")}>
              ← Back to question
            </button>
          )}
          {onFollowUp && (
            <button type="button" onClick={onFollowUp} className={liButton("secondary")}>
              Follow up in this file
            </button>
          )}
        </div>
      )}
    </div>
  );
}
