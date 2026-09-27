import { type RefObject, useEffect, useRef } from "react";
import { checklistGlyph, checklistText, VERDICT_TITLE } from "../copy/verdict-copy";
import type { ChecklistTone, InvestigationView } from "../model/types";

const GLYPH: Record<ChecklistTone, string> = {
  ok: "text-li-evidence-ink",
  silent: "text-li-gap-ink",
  caveat: "text-li-ink font-semibold",
  scope: "text-li-text-subtle",
};

export function VerdictPopover({
  id,
  view,
  onClose,
  anchor,
}: {
  id: string;
  view: InvestigationView;
  onClose: () => void;
  anchor: RefObject<HTMLElement | null>;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target) || anchor.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [onClose, anchor]);

  const headingId = `${id}-title`;
  return (
    <div
      id={id}
      ref={ref}
      role="dialog"
      aria-labelledby={headingId}
      className="absolute top-9.5 right-0 z-20 flex w-75 flex-col gap-2 border border-li-divider bg-li-paper p-3.5 text-[12.5px] shadow-li-lg"
    >
      <h2 id={headingId} className="text-[13px] font-semibold text-li-ink">
        {VERDICT_TITLE[view.verdict]}
      </h2>
      <ul className="grid grid-cols-[16px_minmax(0,1fr)] gap-x-1.5 gap-y-1.25 text-li-neutral-800">
        {view.checklist.map((item, i) => (
          <li key={`${item.kind}-${i}`} className="contents">
            <span aria-hidden className={GLYPH[item.tone]}>
              {checklistGlyph(item)}
            </span>
            <span>{checklistText(item)}</span>
          </li>
        ))}
      </ul>
      {view.confidence && (
        <>
          <div className="flex items-baseline gap-2 border-t border-li-divider pt-2">
            <span className="text-li-text-subtle">Derived confidence</span>
            <span className="ml-auto font-li-mono text-li-ink">
              {view.confidence.score.toFixed(2)} · {view.confidence.level}
            </span>
          </div>
          <p className="text-[11.5px] text-li-text-subtle">
            Computed from the checks above, never the model&apos;s self-assessment.
          </p>
        </>
      )}
    </div>
  );
}
