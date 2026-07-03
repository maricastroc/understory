import type { Confidence } from "@/lib/types";

export type CaseItem = {
  caseId: string;
  question: string;
  recorded: boolean;
  hasNarrative: boolean;
  level: Confidence["level"];
  score: number;
};

export function Sidebar({
  items,
  activeId,
  onSelect,
}: {
  items: CaseItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <aside className="hidden w-[268px] shrink-0 flex-col border-r border-line bg-surface-2 md:flex">
      <div className="flex items-center justify-between px-4 py-4">
        <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-3">Investigations</span>
        <span className="tnum text-[11px] font-semibold text-ink-3">{items.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 pb-4">
        {items.length === 0 ? (
          <p className="px-2 py-6 text-[12.5px] leading-relaxed text-ink-3">
            No investigations yet. Run one to open a case file.
          </p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {items.map((it) => {
              const active = it.caseId === activeId;
              const dot = !it.hasNarrative ? "bg-ink-3" : it.recorded ? "bg-good" : "bg-warn";
              return (
                <button
                  key={it.caseId}
                  onClick={() => onSelect(it.caseId)}
                  className={`group relative grid grid-cols-[auto_1fr] gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors ${
                    active ? "bg-accent-tint" : "hover:bg-inset"
                  }`}
                >
                  {active && <span className="absolute inset-y-2 -left-1 w-0.5 rounded bg-accent" />}
                  <span className={`mt-[5px] size-2 shrink-0 rounded-full ${dot}`} />
                  <span className="min-w-0">
                    <span
                      className={`line-clamp-2 text-[13px] font-medium leading-snug ${
                        active ? "text-accent-press" : "text-ink"
                      }`}
                    >
                      {it.question}
                    </span>
                    <span className="mt-1 block font-mono text-[11px] text-ink-3">
                      {it.caseId}
                      {it.hasNarrative
                        ? ` · ${it.recorded ? "resolved" : "inconclusive"} · ${Math.round(it.score * 100)}%`
                        : " · evidence only"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2.5 border-t border-line px-4 py-3">
        <span className="grid size-[26px] place-items-center rounded-full bg-accent text-[10px] font-semibold text-white">
          MC
        </span>
        <span className="text-[12.5px] font-semibold leading-tight">
          Mariana Castro
          <span className="block text-[11px] font-normal text-ink-3">acme · engineering</span>
        </span>
      </div>
    </aside>
  );
}
