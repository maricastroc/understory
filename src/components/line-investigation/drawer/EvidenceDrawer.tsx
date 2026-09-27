import { useEffect, useId, useRef } from "react";
import type { EvidenceEntry } from "../copy/types";
import type { ViewArtifact, ViewClause } from "../model/types";
import { liButton } from "../parts/button-class";
import { DrawerEntry } from "./DrawerEntry";
import { DrawerList } from "./DrawerList";

export function EvidenceDrawer({
  entries,
  artifacts,
  clauses,
  inspected,
  active,
  onInspect,
  onList,
  onClose,
  onStep,
  onDrill,
}: {
  entries: EvidenceEntry[];
  artifacts: ViewArtifact[];
  clauses: ViewClause[];
  inspected: string | null;
  active: Set<string> | null;
  onInspect: (id: string) => void;
  onList: () => void;
  onClose: () => void;
  onStep: (delta: 1 | -1) => void;
  onDrill?: (a: ViewArtifact) => void;
}) {
  const headingId = useId();
  const heading = useRef<HTMLHeadingElement | null>(null);
  const entry = inspected ? (entries.find((e) => e.id === inspected) ?? null) : null;
  const maxDays = Math.max(
    0,
    ...artifacts.filter((a) => a.onBore).map((a) => a.daysBeforeNow ?? 0),
  );

  useEffect(() => {
    heading.current?.focus();
  }, [inspected]);

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby={headingId}
      className="fixed top-14 right-0 bottom-0 z-30 flex w-95 flex-col border-l border-li-divider bg-li-paper font-li-body shadow-li-lg max-[1100px]:w-1/2 max-[820px]:inset-x-0 max-[820px]:top-auto max-[820px]:h-[85vh] max-[820px]:w-full max-[820px]:border-t max-[820px]:border-l-0"
    >
      {entry ? (
        <>
          <button
            type="button"
            onClick={onList}
            className="cursor-pointer border-b border-li-divider px-4 py-2 text-left text-xs text-li-steel-700 hover:bg-li-neutral-200 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-li-steel"
          >
            ← All evidence
          </button>
          <DrawerEntry
            entry={entry}
            artifacts={artifacts}
            clauses={clauses}
            maxDays={maxDays}
            headingId={headingId}
            headingRef={(el) => {
              heading.current = el;
            }}
            onStep={onStep}
            onClose={onClose}
            onDrill={onDrill}
          />
        </>
      ) : (
        <>
          <div className="flex items-center gap-2.5 border-b border-li-divider px-4 py-3.5">
            <h2
              id={headingId}
              ref={heading}
              tabIndex={-1}
              className="text-sm font-semibold text-li-ink focus:outline-none"
            >
              All evidence
            </h2>
            <span className="text-xs text-li-text-subtle">
              {entries.length} entries, deepest last
            </span>
            <button
              type="button"
              aria-label="Close evidence"
              onClick={onClose}
              className={liButton("icon", "ml-auto")}
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            <DrawerList entries={entries} clauses={clauses} active={active} onInspect={onInspect} />
          </div>
        </>
      )}
    </div>
  );
}
