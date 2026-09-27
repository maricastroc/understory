"use client";

import type { HeadCommit } from "@git-investigator/core/types";
import { useMemo, useState } from "react";
import { DatumRule } from "../../line-investigation/bore/DatumRule";
import { CoreGraphic } from "./CoreGraphic";
import { coreLabel, MOVED_LINES, statusFacts } from "./core-copy";
import { coreHistory, depthScale } from "./depth";
import { headLabel } from "./head-label";
import { MapCard } from "./MapCard";
import { MapCoreItem } from "./MapCoreItem";
import { MAP } from "./map-geometry";
import { whyShown } from "./scope-copy";
import { historyFacts, historyShares } from "./share-copy";
import type { CoreHistory, CoreState, MapCore, MapLayout } from "./types";

const FADE = "transition-opacity duration-150 motion-reduce:transition-none";
const STUB: CoreState = { status: "stub", history: null };

export function MapCanvas({
  layout,
  head,
  recentCommits,
  matches,
  states,
  onOpen,
}: {
  layout: MapLayout;
  head: HeadCommit | null;
  recentCommits: number;
  matches: ReadonlySet<string> | null;
  states: ReadonlyMap<string, CoreState>;
  onOpen: (path: string) => void;
}) {
  const [focus, setFocus] = useState<string | null>(null);
  const label = head ? headLabel(head) : null;

  const mapped = useMemo(
    () =>
      layout.cores
        .map((c) => states.get(c.path))
        .filter((s): s is CoreState => s?.status === "mapped" && !!s.history)
        .map((s) => s.history!),
    [layout.cores, states],
  );
  const scale = useMemo(() => (head ? depthScale(mapped, head) : null), [mapped, head]);
  const views = useMemo(() => {
    const out = new Map<string, CoreHistory>();
    if (!head || !scale) return out;
    for (const c of layout.cores) {
      const s = states.get(c.path);
      if (s?.status === "mapped" && s.history) out.set(c.path, coreHistory(s.history, head, scale));
    }
    return out;
  }, [layout.cores, states, head, scale]);

  const depthPx = scale && mapped.length ? scale.maxYears * scale.pxPerYear : 0;
  const height = Math.max(MAP.datumY + MAP.cardTop + MAP.cardRoom, MAP.datumY + depthPx + 40);
  const focused = focus ? layout.cores.find((c) => c.path === focus) : undefined;

  const opacity = (core: MapCore) => {
    if (matches && !matches.has(core.path)) return 0.15;
    if (focused && focused.path !== core.path) return 0.3;
    return 1;
  };
  const stateOf = (core: MapCore) => states.get(core.path) ?? STUB;

  const card = (() => {
    if (!focused) return null;
    const state = stateOf(focused);
    const view = views.get(focused.path) ?? null;
    const left =
      focused.x + MAP.cardGap + MAP.cardWidth > layout.width
        ? focused.x - MAP.cardGap - MAP.cardWidth
        : focused.x + MAP.cardGap;
    return (
      <MapCard
        core={focused}
        left={left}
        top={MAP.datumY + MAP.cardTop}
        facts={view ? historyFacts(view) : statusFacts(state.status)}
        history={view}
        shares={view ? historyShares(view) : null}
        why={whyShown(focused.reason, recentCommits)}
        note={
          view ? `${MOVED_LINES} Click to open and pick a line.` : "Click to open and pick a line."
        }
      />
    );
  })();

  return (
    <div className="relative" style={{ width: layout.width, height }}>
      {layout.dirs.map((d) => (
        <p
          key={d.key}
          className={`absolute top-0 truncate border-t border-li-neutral-500 pt-1 font-li-mono text-[11px] text-li-neutral-700 ${FADE}`}
          style={{
            left: d.left,
            width: d.width,
            opacity: focused ? ((focused.dir || "./") === d.key ? 1 : 0.4) : 1,
          }}
        >
          {d.label}
        </p>
      ))}

      <p
        className="absolute w-9 text-right font-li-mono text-[9.5px] leading-[1.15] text-li-datum-ink"
        style={{ left: 0, top: MAP.datumY - 26 }}
      >
        ±0
        <br />
        HEAD
      </p>
      {label && (
        <p
          className="absolute w-9 text-right font-li-mono text-[9px] leading-[1.2] text-li-datum-ink"
          style={{ left: 0, top: MAP.datumY + 6 }}
        >
          {label.sha}
          <br />
          {label.day}
          <br />
          {label.year}
        </p>
      )}
      {scale &&
        mapped.length > 0 &&
        scale.ticks.map((y) => (
          <p
            key={y}
            aria-hidden
            className="absolute w-9 text-right font-li-mono text-[9.5px] text-li-neutral-700"
            style={{ left: 0, top: MAP.datumY + y * scale.pxPerYear - 6 }}
          >
            −{y}y
          </p>
        ))}

      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-visible"
        width={layout.width}
        height={height}
      >
        {scale && mapped.length > 0 && (
          <>
            <line
              x1={MAP.axisX}
              x2={MAP.axisX}
              y1={MAP.datumY}
              y2={MAP.datumY + depthPx + 20}
              className="stroke-li-neutral-400"
            />
            {scale.ticks.map((y) => (
              <line
                key={y}
                x1={MAP.axisX}
                x2={MAP.axisX + 6}
                y1={MAP.datumY + y * scale.pxPerYear}
                y2={MAP.datumY + y * scale.pxPerYear}
                className="stroke-li-neutral-500"
              />
            ))}
          </>
        )}
        <DatumRule x1={MAP.axisX} x2={layout.width} y={MAP.datumY} />
        {layout.cores.map((c) => (
          <CoreGraphic
            key={c.path}
            x={c.x}
            status={stateOf(c).status}
            history={views.get(c.path) ?? null}
            opacity={opacity(c)}
          />
        ))}
      </svg>

      <ul aria-label="Files shown">
        {layout.cores.map((c) => {
          const view = views.get(c.path) ?? null;
          return (
            <MapCoreItem
              key={c.path}
              core={c}
              opacity={opacity(c)}
              focused={focus === c.path}
              label={coreLabel(c, stateOf(c).status, view)}
              reach={view ? view.bottom - MAP.datumY + 12 : MAP.stub + 12}
              onOpen={() => onOpen(c.path)}
              onFocus={() => setFocus(c.path)}
              onBlur={() => setFocus((f) => (f === c.path ? null : f))}
            />
          );
        })}
      </ul>

      {card}
    </div>
  );
}
