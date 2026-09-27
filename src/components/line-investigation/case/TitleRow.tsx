import { useId, useRef } from "react";
import type { InvestigationView } from "../model/types";
import { liButton } from "../parts/button-class";
import { VerdictButton } from "../verdict/VerdictButton";
import { VerdictPopover } from "../verdict/VerdictPopover";

function Location({ view }: { view: InvestigationView }) {
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
      {view.pinnedSha && (
        <span className="ml-2 whitespace-nowrap">blame @ {view.pinnedSha.slice(0, 7)}</span>
      )}
    </div>
  );
}

export function TitleRow({
  view,
  verdictOpen,
  onToggleVerdict,
  onCloseVerdict,
  onFollowUp,
}: {
  view: InvestigationView;
  verdictOpen: boolean;
  onToggleVerdict: () => void;
  onCloseVerdict: () => void;
  onFollowUp?: () => void;
}) {
  const popoverId = useId();
  const anchor = useRef<HTMLDivElement>(null);
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 max-[819px]:flex-col max-[819px]:items-start">
      <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-4 gap-y-1.5">
        <h1
          title={view.question}
          className="max-w-full min-w-0 truncate font-li-body text-[32px] leading-[1.1] font-semibold tracking-[-0.02em] text-li-ink max-[819px]:line-clamp-2 max-[819px]:text-2xl max-[819px]:whitespace-normal"
        >
          {view.question}
        </h1>
        <Location view={view} />
      </div>
      <div className="flex items-center gap-2">
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
        {onFollowUp && (
          <button type="button" onClick={onFollowUp} className={liButton("secondary")}>
            Ask a follow-up
          </button>
        )}
      </div>
    </div>
  );
}
