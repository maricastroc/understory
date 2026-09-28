import type { DigResult } from "@git-investigator/core/types";
import { CaseRail } from "./CaseRail";

export function RightRail({ result }: { result: DigResult }) {
  return (
    <aside
      aria-label="Investigation details"
      className="hidden w-71 shrink-0 overflow-y-auto border-l border-line-2 bg-surface-2 xl:block"
    >
      <div className="flex flex-col gap-3.5 p-4.5 pb-10">
        <CaseRail result={result} />
      </div>
    </aside>
  );
}

export function RailContent({ result }: { result: DigResult }) {
  return <CaseRail result={result} />;
}
