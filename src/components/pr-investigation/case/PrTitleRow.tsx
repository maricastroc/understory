import { useId, useRef } from "react";
import { liButton } from "../../line-investigation/parts/button-class";
import { VerdictPopover } from "../../line-investigation/verdict/VerdictPopover";
import { coverageConfidence, coverageDetails, coverageRows } from "../copy/coverage-copy";
import type { PrView } from "../model/types";
import { CoverageChip } from "../verdict/CoverageChip";

export function PrTitleRow({
  view,
  open,
  onToggle,
  onClose,
}: {
  view: PrView;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const popoverId = useId();
  const anchor = useRef<HTMLDivElement>(null);
  const files = view.triage.filesChanged;
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 max-[820px]:flex-col max-[820px]:items-start">
      <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-4 gap-y-1.5">
        <h1
          title={view.pr.title}
          className="max-w-full min-w-0 truncate font-li-body text-[32px] leading-[1.1] font-semibold tracking-[-0.02em] text-li-ink max-[820px]:line-clamp-2 max-[820px]:text-2xl max-[820px]:whitespace-normal"
        >
          {view.pr.title}
        </h1>
        <div className="flex shrink-0 items-center gap-1.5 font-li-mono text-xs whitespace-nowrap text-li-text-subtle">
          <span className="bg-li-datum-strong px-1.5 py-px text-li-ink">#{view.pr.number}</span>
          <span className="ml-1.5">
            {view.pr.baseSha.slice(0, 7)} → {view.pr.headSha.slice(0, 7)}
          </span>
          <span className="ml-1.5">
            {files} file{files === 1 ? "" : "s"}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div ref={anchor} className="relative">
          <CoverageChip view={view} open={open} controls={popoverId} onToggle={onToggle} />
          {open && (
            <VerdictPopover
              id={popoverId}
              title="How much of this PR is explained"
              rows={coverageRows(view)}
              details={coverageDetails(view)}
              confidence={coverageConfidence(view)}
              wide
              onClose={onClose}
              anchor={anchor}
            />
          )}
        </div>
        <a
          href={view.pr.url}
          target="_blank"
          rel="noopener noreferrer"
          className={liButton("secondary")}
        >
          Open PR ↗
        </a>
      </div>
    </div>
  );
}
