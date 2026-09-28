import type { RailFooterInfo } from "./types";

export function RailFooter({ info }: { info: RailFooterInfo }) {
  return (
    <div className="mt-auto flex items-center gap-2.5 border-t border-li-divider px-4 py-3.5 text-[13px]">
      <span
        aria-hidden
        className="grid size-6.5 shrink-0 place-items-center rounded-full bg-li-steel-800 text-[11px] font-semibold text-li-paper"
      >
        {info.initials}
      </span>
      <span className="flex min-w-0 flex-col leading-[1.3]">
        <span className="truncate font-medium text-li-ink">{info.name}</span>
        <span className="text-[11.5px] text-li-text-subtle">{info.subline}</span>
      </span>
    </div>
  );
}
