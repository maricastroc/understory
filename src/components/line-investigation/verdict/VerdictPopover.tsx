import { type RefObject, useEffect, useRef } from "react";
import type { ChecklistTone } from "../model/types";
import type { PopoverRow } from "./popover-row";

const GLYPH: Record<ChecklistTone, string> = {
  ok: "text-li-evidence-ink",
  silent: "text-li-gap-ink",
  caveat: "text-li-ink font-semibold",
  scope: "text-li-text-subtle",
};

export function VerdictPopover({
  id,
  title,
  rows,
  details = [],
  confidence,
  wide = false,
  onClose,
  anchor,
}: {
  id: string;
  title: string;
  rows: PopoverRow[];
  details?: string[];
  confidence: { value: string; note: string } | null;
  wide?: boolean;
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
      className={`absolute top-9.5 right-0 z-20 flex flex-col gap-2 border border-li-divider bg-li-paper p-3.5 text-[12.5px] shadow-li-lg ${wide ? "w-80" : "w-75"}`}
    >
      <h2 id={headingId} className="text-[13px] font-semibold text-li-ink">
        {title}
      </h2>
      <ul className="grid grid-cols-[16px_minmax(0,1fr)] gap-x-1.5 gap-y-1.25 text-li-neutral-800">
        {rows.map((row) => (
          <li key={row.key} className="contents">
            <span aria-hidden className={GLYPH[row.tone]}>
              {row.glyph}
            </span>
            <span className={row.clay ? "text-li-gap-ink" : undefined}>{row.text}</span>
          </li>
        ))}
      </ul>
      {details.length > 0 && (
        <div className="flex flex-col gap-0.75 border-t border-li-divider pt-2 text-li-text-subtle">
          {details.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
      )}
      {confidence && (
        <>
          <div className="flex items-baseline gap-2 border-t border-li-divider pt-2">
            <span className="text-li-text-subtle">Derived confidence</span>
            <span className="ml-auto font-li-mono text-li-ink">{confidence.value}</span>
          </div>
          <p className="text-[11.5px] text-li-text-subtle">{confidence.note}</p>
        </>
      )}
    </div>
  );
}
