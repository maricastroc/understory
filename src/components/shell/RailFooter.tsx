import type { RailFooterInfo } from "./types";

export function RailFooter({ info }: { info: RailFooterInfo }) {
  return (
    <div className="mt-auto flex min-h-14 items-center gap-2.5 border-t border-li-divider px-4 py-3 text-[13px]">
      <span
        aria-hidden
        className={`grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${
          info.guest
            ? "border border-dashed border-li-neutral-500 text-li-text-subtle"
            : "bg-li-ink text-li-paper"
        }`}
      >
        {info.initials}
      </span>
      <span className="flex min-w-0 flex-col leading-[1.3]">
        <span className="truncate font-medium text-li-ink">{info.name}</span>
        <span className="truncate text-[12px] text-li-text-subtle">{info.subline}</span>
      </span>
    </div>
  );
}
