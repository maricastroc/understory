import { MAP, SPARSE } from "./map-geometry";
import type { MapCore, MapLayout } from "./types";

const FADE = "transition-opacity duration-150 motion-reduce:transition-none";

function CaseRing({ count, inverted = false }: { count: number; inverted?: boolean }) {
  return (
    <span aria-hidden className="flex shrink-0 items-center gap-0.75">
      <span
        className={`size-2.25 rounded-full border-[1.5px] ${
          inverted ? "border-li-paper bg-li-ink" : "border-li-ink bg-li-paper"
        }`}
      />
      <span className={`font-li-mono text-[10px] ${inverted ? "text-li-paper" : "text-li-ink"}`}>
        {count}
      </span>
    </span>
  );
}

export function MapCoreItem({
  core,
  layout,
  opacity,
  muted,
  focused,
  label,
  reach,
  age,
  onOpen,
  onFocus,
}: {
  core: MapCore;
  layout: MapLayout;
  opacity: number;
  muted: boolean;
  focused: boolean;
  label: string;
  reach: number;
  age: string | null;
  onOpen: () => void;
  onFocus: () => void;
}) {
  const top = layout.datumY;
  const sparse = layout.mode === "sparse";
  const tabWidth = layout.step - SPARSE.tabInset * 2;
  const events = { onMouseEnter: onFocus, onFocus };

  return (
    <li className={`pointer-events-none absolute inset-0 ${FADE}`} style={{ opacity }}>
      {sparse ? (
        <button
          type="button"
          aria-label={label}
          onClick={onOpen}
          {...events}
          className={`pointer-events-auto absolute flex cursor-pointer items-center justify-center gap-1.5 border px-2 font-li-mono text-[12.5px] whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-li-focus motion-reduce:transition-none ${
            focused
              ? "border-li-ink bg-li-ink text-li-paper"
              : muted
                ? "border-li-neutral-500 bg-li-paper text-li-text-muted"
                : "border-li-ink bg-li-paper text-li-ink"
          }`}
          style={{
            left: core.x - tabWidth / 2,
            top: top - SPARSE.tabRise,
            width: tabWidth,
            height: SPARSE.tabHeight,
          }}
        >
          <span className="truncate">{core.name}</span>
          {core.cases > 0 && <CaseRing count={core.cases} inverted={focused} />}
        </button>
      ) : (
        <>
          <button
            type="button"
            aria-label={label}
            onClick={onOpen}
            {...events}
            className={`pointer-events-auto absolute origin-bottom-left -rotate-40 cursor-pointer px-0.5 font-li-mono text-[12px] leading-3.5 whitespace-nowrap underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-li-focus ${
              focused ? "font-semibold text-li-ink" : muted ? "text-li-text-muted" : "text-li-ink"
            }`}
            style={{ left: core.x - 2, top: top - MAP.labelRise }}
          >
            {core.name}
          </button>
          {core.cases > 0 && (
            <span
              className="pointer-events-none absolute"
              style={{ left: core.x - 22, top: top - 14 }}
            >
              <CaseRing count={core.cases} />
            </span>
          )}
        </>
      )}
      {age && (
        <span
          aria-hidden
          className={`pointer-events-none absolute -translate-x-1/2 font-li-mono text-[11px] whitespace-nowrap ${
            muted ? "text-li-text-muted" : "text-li-neutral-800"
          }`}
          style={{ left: core.x, top: top + reach - 4 }}
        >
          {age}
        </span>
      )}
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        onClick={onOpen}
        onMouseEnter={onFocus}
        className="pointer-events-auto absolute cursor-pointer"
        style={{
          left: core.x - (sparse ? layout.step / 2 - 6 : MAP.hit / 2),
          top,
          width: sparse ? layout.step - 12 : MAP.hit,
          height: reach + (age ? 18 : 0),
        }}
      />
    </li>
  );
}
