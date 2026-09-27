export function SegmentedFilter<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="mx-4 mb-3 grid overflow-hidden rounded border border-li-divider text-center text-xs"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const checked = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(o.value)}
            className={`cursor-pointer py-1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-li-steel ${
              checked ? "bg-li-ink text-li-paper" : "text-li-ink hover:bg-li-neutral-200"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
