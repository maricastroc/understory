import { MAP } from "./map-geometry";
import type { MapCore } from "./types";

const FADE = "transition-opacity duration-150 motion-reduce:transition-none";

export function MapCoreItem({
  core,
  opacity,
  focused,
  label,
  reach,
  onOpen,
  onFocus,
  onBlur,
}: {
  core: MapCore;
  opacity: number;
  focused: boolean;
  label: string;
  reach: number;
  onOpen: () => void;
  onFocus: () => void;
  onBlur: () => void;
}) {
  const top = MAP.datumY;
  return (
    <li className={`pointer-events-none absolute inset-0 ${FADE}`} style={{ opacity }}>
      <button
        type="button"
        aria-label={label}
        onClick={onOpen}
        onMouseEnter={onFocus}
        onMouseLeave={onBlur}
        onFocus={onFocus}
        onBlur={onBlur}
        className={`pointer-events-auto absolute origin-bottom-left -rotate-40 cursor-pointer px-0.5 font-li-mono text-[11.5px] leading-3.5 whitespace-nowrap text-li-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-li-steel ${
          focused ? "font-semibold" : ""
        }`}
        style={{ left: core.x - 2, top: top - MAP.labelRise }}
      >
        {core.name}
      </button>
      {core.cases > 0 && (
        <span
          aria-hidden
          className="pointer-events-none absolute flex items-center gap-0.75"
          style={{ left: core.x - 22, top: top - 14 }}
        >
          <span className="size-2.25 rounded-full border-[1.5px] border-li-ink bg-li-paper" />
          <span className="font-li-mono text-[9.5px] text-li-ink">{core.cases}</span>
        </span>
      )}
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        onClick={onOpen}
        onMouseEnter={onFocus}
        onMouseLeave={onBlur}
        className="pointer-events-auto absolute cursor-pointer"
        style={{ left: core.x - MAP.hit / 2, top, width: MAP.hit, height: reach }}
      />
    </li>
  );
}
