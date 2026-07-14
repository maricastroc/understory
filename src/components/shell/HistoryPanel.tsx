import type { ReactNode } from "react";
import { Close, Plus, User } from "../icons";
import type { AuthUser } from "../investigator/use-auth";
import { Avatar } from "../ui";

export type HistoryPanelProps = {
  label: string;
  count: number;
  onNew?: () => void;
  newLabel?: string;
  emptyIcon: ReactNode;
  emptyTitle: string;
  emptyBody: string;
  user?: AuthUser | null;
  children: ReactNode;
};

export function HistoryPanel({
  label,
  count,
  onNew,
  newLabel = "New",
  onClose,
  emptyIcon,
  emptyTitle,
  emptyBody,
  user,
  children,
}: HistoryPanelProps & { onClose?: () => void }) {
  return (
    <>
      <div className="flex items-center gap-2 px-4 py-4">
        <span className="text-[11px] font-semibold tracking-[0.07em] text-ink-2 uppercase">
          {label}
        </span>
        <span className="ml-auto text-[11px] font-semibold text-ink-3 tnum">{count}</span>
        {onNew && (
          <button
            type="button"
            aria-label={newLabel}
            title={newLabel}
            onClick={onNew}
            className="grid size-7 cursor-pointer place-items-center rounded-md border border-line-2 bg-surface text-ink-2 transition-colors hover:bg-inset hover:text-ink"
          >
            <Plus className="size-4" />
          </button>
        )}
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
        {count === 0 ? (
          <div className="mt-8 flex flex-col items-center px-4 text-center">
            <span className="grid size-11 place-items-center rounded-full border border-line bg-surface text-ink-3 shadow-card">
              {emptyIcon}
            </span>
            <p className="mt-3 text-[13px] font-semibold text-ink-2">{emptyTitle}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-3">{emptyBody}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">{children}</div>
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
