const STAGES = [
  "Collecting from git",
  "Building timeline",
  "Reconstructing the why",
  "Verifying citations",
];

export function LoadingCard() {
  return (
    <div role="status" className="rounded-[10px] border border-line bg-surface p-6 shadow-card">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="size-4 animate-spin rounded-full border-2 border-line-2 border-t-accent"
        />
        <span className="text-[14px] font-semibold text-ink">Investigating…</span>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-3">
        {STAGES.map((s, i) => (
          <span key={s} className="flex items-center gap-2">
            {i > 0 && <span className="text-line-2">→</span>}
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}
