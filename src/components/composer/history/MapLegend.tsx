import { HATCH } from "../../line-investigation/parts/hatch";

function Swatch({ className, style }: { className: string; style?: React.CSSProperties }) {
  return <span aria-hidden className={`block ${className}`} style={style} />;
}

const STUB =
  "repeating-linear-gradient(180deg, var(--color-li-neutral-500) 0 3px, transparent 3px 6px)";

export function MapLegend({ note }: { note: string | null }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-li-neutral-800">
      <ul aria-label="Legend" className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
        <li className="flex items-center gap-1.5">
          <Swatch className="h-1.5 w-4.5 border border-li-evidence-edge bg-li-evidence-tint" />
          PR found
        </li>
        <li className="flex items-center gap-1.5">
          <Swatch
            className="h-1.5 w-4.5 border border-dashed border-li-gap"
            style={{ background: HATCH }}
          />
          no PR on GitHub
        </li>
        <li className="flex items-center gap-1.5">
          <Swatch className="h-1.5 w-4.5 border border-li-neutral-500" />
          not checked
        </li>
        <li className="flex items-center gap-1.5">
          <Swatch className="h-3.5 w-[1.5px]" style={{ background: STUB }} />
          not mapped yet
        </li>
        <li className="flex items-center gap-1.5">
          <Swatch className="size-2 rounded-full border-[1.5px] border-li-ink" />
          your cases
        </li>
      </ul>
      {note && <p className="ml-auto text-li-neutral-700">{note}</p>}
    </div>
  );
}
