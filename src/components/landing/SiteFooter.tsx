import { Logo } from "@/components/icons";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-center font-mono text-[12px] text-ink-3 sm:flex-row sm:px-6 sm:text-left">
        <div className="flex items-center gap-2">
          <Logo className="size-4 text-ink-3" />
          <span>git-investigator — Mariana Castro</span>
        </div>
        <span>evidence &gt; assertions</span>
      </div>
    </footer>
  );
}
