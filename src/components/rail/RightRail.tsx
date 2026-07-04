import type { DigResult, RepoMeta } from "@/lib/types";
import { CaseRail } from "./CaseRail";
import { RepoRail } from "./RepoRail";

export function RightRail({
  result,
  repoMeta,
}: {
  result: DigResult | null;
  repoMeta?: RepoMeta | null;
}) {
  return (
    <aside className="hidden w-[284px] shrink-0 overflow-y-auto border-l border-line-2 bg-surface-2 xl:block">
      <div className="flex flex-col gap-3.5 p-[18px] pb-10">
        {result ? (
          <CaseRail result={result} />
        ) : repoMeta ? (
          <RepoRail meta={repoMeta} />
        ) : (
          <RailPlaceholder />
        )}
      </div>
    </aside>
  );
}

function RailPlaceholder() {
  return (
    <div className="rounded-[10px] border border-dashed border-line-2 bg-surface p-5 text-[12.5px] leading-relaxed text-ink-3">
      Repository metadata, chain of provenance, and the people behind the change appear here once an
      investigation runs.
    </div>
  );
}
