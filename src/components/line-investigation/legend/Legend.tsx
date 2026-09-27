const HATCH = "repeating-linear-gradient(135deg, var(--color-li-gap) 0 1px, transparent 1px 4px)";

export function Legend() {
  return (
    <ul
      aria-label="Key"
      className="ml-1.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[11.5px] text-li-text-subtle"
    >
      <li className="flex items-center gap-1.25">
        <span className="size-2.25 rounded-full border-[1.5px] border-li-ink bg-li-evidence" />
        commit
      </li>
      <li className="flex items-center gap-1.25">
        <span className="h-3 w-1.5 border border-li-evidence-edge bg-li-evidence-tint" />
        PR
      </li>
      <li className="flex items-center gap-1.25">
        <span className="h-0.5 w-2.5 bg-li-ink" />
        review
      </li>
      <li className="flex items-center gap-1.25">
        <span className="size-2 rotate-45 border-[1.5px] border-li-ink bg-li-evidence" />
        issue
      </li>
      <li className="flex items-center gap-1.25">
        <span
          className="size-2.75 border border-dashed border-li-gap"
          style={{ background: HATCH }}
        />
        not recorded
      </li>
      <li className="flex items-center gap-1.25">
        <span className="size-2.75 border border-dashed border-li-unverified" />
        not verified
      </li>
      <li className="flex items-center gap-1.25">
        <span className="size-2.25 rounded-full bg-li-evidence" />
        cited ·
        <span className="size-2.25 rounded-full border-[1.5px] border-li-ink" />
        supporting
      </li>
      <li>depth = time before today</li>
    </ul>
  );
}
