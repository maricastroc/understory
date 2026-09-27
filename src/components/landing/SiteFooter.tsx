import { CONTAINER } from "./parts/landing-classes";

export function SiteFooter() {
  return (
    <footer className="border-t border-li-divider">
      <div
        className={`${CONTAINER} flex flex-wrap justify-between gap-4 py-6 font-li-mono text-xs text-li-neutral-700`}
      >
        <span>git-investigator · Mariana Castro</span>
        <span>evidence &gt; assertions</span>
      </div>
    </footer>
  );
}
