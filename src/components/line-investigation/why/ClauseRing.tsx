export function ClauseRing({
  silent,
  filled,
  className = "",
}: {
  silent: boolean;
  filled: boolean;
  className?: string;
}) {
  const ring = silent
    ? `border-dashed border-li-gap ${filled ? "bg-li-gap" : ""}`
    : `border-li-evidence-ink ${filled ? "bg-li-evidence" : ""}`;
  return (
    <span
      aria-hidden
      className={`pointer-events-none size-3 shrink-0 rounded-full border-[1.5px] ${ring} ${className}`}
    />
  );
}
