export function RangeToggle({
  label,
  expanded,
  controls,
  placement,
  onToggle,
}: {
  label: string;
  expanded: boolean;
  controls: string;
  placement: "top" | "bottom";
  onToggle: () => void;
}) {
  const shape = placement === "top" ? "h-6.5" : "h-7.5 border-t border-li-divider";
  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onToggle}
      className={`flex w-full shrink-0 cursor-pointer items-center pl-23 text-left text-[11px] text-li-steel-700 transition-colors hover:bg-li-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-li-focus motion-reduce:transition-none ${shape}`}
    >
      {label}
    </button>
  );
}
