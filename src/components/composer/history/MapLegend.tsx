import { HATCH } from "../../line-investigation/parts/hatch";
import { ScaleBreakMark } from "./ScaleBreakMark";

function Swatch({ className, style }: { className: string; style?: React.CSSProperties }) {
  return <span aria-hidden className={`block ${className}`} style={style} />;
}

const STUB =
  "repeating-linear-gradient(180deg, var(--color-li-neutral-500) 0 3px, transparent 3px 6px)";

export type LegendKey = "found" | "none" | "unknown" | "mapping" | "stub" | "cases" | "break";

const ITEMS: Record<LegendKey, { label: string; swatch: React.ReactNode }> = {
  found: {
    label: "PR found",
    swatch: <Swatch className="h-2 w-4.5 border border-li-evidence-edge bg-li-evidence-tint" />,
  },
  none: {
    label: "no PR on GitHub",
    swatch: (
      <Swatch
        className="h-2 w-4.5 border border-dashed border-li-gap"
        style={{ background: HATCH }}
      />
    ),
  },
  unknown: {
    label: "not checked",
    swatch: <Swatch className="h-2 w-4.5 border border-li-neutral-500" />,
  },
  mapping: {
    label: "mapping",
    swatch: (
      <Swatch
        className="h-3.5 w-0.5"
        style={{
          background:
            "repeating-linear-gradient(180deg, var(--color-li-steel) 0 3px, transparent 3px 6px)",
        }}
      />
    ),
  },
  stub: {
    label: "not mapped yet",
    swatch: <Swatch className="h-3.5 w-0.5" style={{ background: STUB }} />,
  },
  cases: {
    label: "your cases",
    swatch: <Swatch className="size-2 rounded-full border-[1.5px] border-li-ink" />,
  },
  break: {
    label: "depth compressed past the break",
    swatch: (
      <svg aria-hidden width={10} height={16} className="block overflow-visible">
        <ScaleBreakMark x={5} y={8} />
      </svg>
    ),
  },
};

const ORDER: LegendKey[] = ["found", "none", "unknown", "mapping", "stub", "cases", "break"];

export function MapLegend({
  present,
  note,
}: {
  present: ReadonlySet<LegendKey>;
  note: string | null;
}) {
  const keys = ORDER.filter((k) => present.has(k));
  if (!keys.length && !note) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12.5px] text-li-neutral-800">
      <ul aria-label="Legend" className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
        {keys.map((k) => (
          <li key={k} className="flex items-center gap-1.5">
            {ITEMS[k].swatch}
            {ITEMS[k].label}
          </li>
        ))}
      </ul>
      {note && <p className="ml-auto text-li-neutral-800">{note}</p>}
    </div>
  );
}
