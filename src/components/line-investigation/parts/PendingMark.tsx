export function PendingMark({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block size-3 shrink-0 rounded-full border-[1.5px] border-dashed border-current ${className}`}
    />
  );
}
