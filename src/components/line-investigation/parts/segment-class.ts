export const SEGMENT_GROUP = "grid shrink-0 overflow-hidden border border-li-divider";

export function segmentClass(active: boolean): string {
  return `cursor-pointer font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-li-focus motion-reduce:transition-none ${
    active
      ? "bg-li-neutral-200 text-li-ink shadow-[inset_0_-2px_0_var(--color-li-ink)]"
      : "text-li-text-subtle hover:bg-li-neutral-200/60 hover:text-li-ink"
  }`;
}
