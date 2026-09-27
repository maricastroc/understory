import { SPINNER } from "../composer/composer-classes";

const STAGES = [
  "Collecting from git",
  "Building timeline",
  "Reconstructing the why",
  "Verifying citations",
];

export function LoadingCard() {
  return (
    <div
      role="status"
      className="border border-li-divider bg-li-neutral-100 p-6 font-li-body text-li-ink shadow-li-sm"
    >
      <div className="flex items-center gap-3">
        <span aria-hidden className={`size-4 ${SPINNER}`} />
        <span className="text-sm font-semibold">Investigating…</span>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-li-text-subtle">
        {STAGES.map((s, i) => (
          <span key={s} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden>→</span>}
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}
