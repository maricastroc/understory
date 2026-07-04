import { Close, Search, User } from "../icons";
import type { AuthUser } from "../investigator/use-auth";
import { Avatar } from "../ui";
import { CaseRow } from "./CaseRow";
import type { CaseItem } from "./case-item";

export function SidebarBody({
  items,
  activeId,
  onSelect,
  onRemove,
  filtering = false,
  user,
  onClose,
}: {
  items: CaseItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  filtering?: boolean;
  user?: AuthUser | null;
  onClose?: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-2 px-4 py-4">
        <span className="text-[11px] font-semibold tracking-[0.07em] text-ink-2 uppercase">
          Investigations
        </span>
        <span className="ml-auto text-[11px] font-semibold text-ink-3 tnum">{items.length}</span>
        {onClose && (
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="-mr-1 grid size-8 cursor-pointer place-items-center rounded-md text-ink-3 transition-colors hover:bg-inset hover:text-ink"
          >
            <Close className="size-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 pb-4">
        {items.length === 0 ? (
          <div className="mt-8 flex flex-col items-center px-4 text-center">
            <span className="grid size-11 place-items-center rounded-full border border-line bg-surface text-ink-3 shadow-card">
              <Search className="size-4.5" />
            </span>
            <p className="mt-3 text-[13px] font-semibold text-ink-2">
              {filtering ? "No matches" : "No investigations yet"}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-3">
              {filtering
                ? "Nothing matches your search. Try a different term."
                : "Open a repo, click a line, and run one — each case files itself here."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {items.map((it) => (
              <CaseRow
                key={it.caseId}
                item={it}
                active={it.caseId === activeId}
                onSelect={onSelect}
                onRemove={onRemove}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2.5 border-t border-line px-4 py-3">
        {user ? (
          <>
            <Avatar name={user.name} src={user.avatarUrl} size={26} />
            <span className="min-w-0 text-[12.5px] leading-tight font-semibold">
              <span className="block truncate">{user.name}</span>
              <span className="block truncate font-mono text-[11px] font-normal text-ink-3">
                @{user.login}
              </span>
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
    </>
  );
}
