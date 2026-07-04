import type { Confidence } from "@/lib/types";
import { Close, User } from "./icons";
import { Avatar } from "./ui";

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
  onRemove,
  filtering = false,
  user,
}: {
  items: CaseItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  filtering?: boolean;
  user?: { name: string; role?: string } | null;
}) {
  return (
    <aside className="hidden w-67 shrink-0 flex-col border-r border-line-2 bg-surface-2 md:flex">
      <div className="flex items-center justify-between px-4 py-4">
        <span className="text-[11px] font-semibold tracking-[0.07em] text-ink-2 uppercase">
          Investigations
        </span>
        <span className="text-[11px] font-semibold text-ink-3 tnum">{items.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 pb-4">
        {items.length === 0 ? (
          <p className="px-2 py-6 text-[12.5px] leading-relaxed text-ink-3">
            {filtering
              ? "No investigations match your search."
              : "No investigations yet. Run one to open a case file."}
          </p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {items.map((it) => {
              const active = it.caseId === activeId;
              const dot = !it.hasNarrative ? "bg-ink-3" : it.recorded ? "bg-good" : "bg-warn";
              return (
                <div
                  key={it.caseId}
                  className={`group relative rounded-md transition-colors ${
                    active ? "bg-accent-tint" : "hover:bg-inset"
                  }`}
                >
                  {active && (
                    <span className="absolute inset-y-2 -left-1 w-0.5 rounded bg-accent" />
                  )}
                  <button
                    onClick={() => onSelect(it.caseId)}
                    className="grid w-full cursor-pointer grid-cols-[auto_1fr] gap-2.5 rounded-md px-2.5 py-2 text-left"
                  >
                    <span className={`mt-1.25 size-2 shrink-0 rounded-full ${dot}`} />
                    <span className="min-w-0 pr-5">
                      <span
                        className={`line-clamp-2 text-[13px] leading-snug font-medium ${
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
                  <button
                    type="button"
                    aria-label="Remove investigation"
                    onClick={() => onRemove(it.caseId)}
                    className="absolute top-1.5 right-1.5 grid size-6 cursor-pointer place-items-center rounded-md text-ink-3 opacity-0 transition-[opacity,color,background-color] group-hover:opacity-100 hover:bg-line-2/70 hover:text-ink focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
                  >
                    <Close className="size-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2.5 border-t border-line px-4 py-3">
        {user ? (
          <>
            <Avatar name={user.name} size={26} />
            <span className="text-[12.5px] leading-tight font-semibold">
              {user.name}
              {user.role && (
                <span className="block text-[11px] font-normal text-ink-3">{user.role}</span>
              )}
            </span>
          </>
        ) : (
          <>
            <span className="grid size-6.5 place-items-center rounded-full border border-line-2 bg-inset text-ink-3">
              <User className="size-3.5" />
            </span>
            <span className="text-[12.5px] leading-tight font-semibold text-ink-2">
              Guest
              <span className="block text-[11px] font-normal text-ink-3">Not signed in</span>
            </span>
          </>
        )}
      </div>
    </aside>
  );
}
