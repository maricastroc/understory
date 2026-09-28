import { SEGMENT_GROUP, segmentClass } from "./segment-class";

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
      className={`${SEGMENT_GROUP} mx-4 mb-3 h-7 text-center text-xs`}
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
            className={segmentClass(checked)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
