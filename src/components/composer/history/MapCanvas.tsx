"use client";

import type { HeadCommit } from "@understory/core/types";
import { useMemo } from "react";
import { DatumRule } from "../../line-investigation/bore/DatumRule";
import { shortAge } from "../../line-investigation/format/age";
import { CoreGraphic } from "./CoreGraphic";
import { coreLabel, MOVED_LINES, statusFacts } from "./core-copy";
import { coreHistory, depthScale } from "./depth";
import { headLabel } from "./head-label";
import { MapCard } from "./MapCard";
import { MapCoreItem } from "./MapCoreItem";
import { BREAK_HALF, ScaleBreakMark } from "./ScaleBreakMark";
import { MAP } from "./map-geometry";
import { whyShown } from "./scope-copy";
import { historyFacts, historyShares } from "./share-copy";
import type { CoreHistory, CoreState, MapCore, MapLayout } from "./types";

const STUB: CoreState = { status: "stub", history: null };

export function useCoreViews(
  layout: MapLayout,
  states: ReadonlyMap<string, CoreState>,
  head: HeadCommit | null,
) {
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
      if (s?.status === "mapped" && s.history) {
        out.set(c.path, coreHistory(s.history, head, scale, layout.datumY));
      }
    }
    return out;
  }, [layout, states, head, scale]);
  return { mapped, scale, views };
}

export function MapCanvas({
  layout,
  head,
  recentCommits,
  matches,
  states,
  focus,
  onFocus,
  onOpen,
  card,
}: {
  layout: MapLayout;
  head: HeadCommit | null;
  recentCommits: number;
  matches: ReadonlySet<string> | null;
  states: ReadonlyMap<string, CoreState>;
  focus: string | null;
  onFocus: (path: string | null) => void;
  onOpen: (path: string) => void;
  card: boolean;
}) {
  const label = head ? headLabel(head) : null;
  const { mapped, scale, views } = useCoreViews(layout, states, head);
  const datumY = layout.datumY;

  const depthPx = scale && mapped.length ? scale.depth : 0;
  const height = Math.max(
    datumY + (card ? MAP.cardTop + MAP.cardRoom : MAP.stub + 64),
    datumY + depthPx + 32,
  );
  const focused = focus ? layout.cores.find((c) => c.path === focus) : undefined;

  const hidden = (core: MapCore) => !!matches && !matches.has(core.path);
  const muted = (core: MapCore) => !!focused && focused.path !== core.path;
  const opacity = (core: MapCore) => (hidden(core) ? 0.15 : muted(core) ? 0.35 : 1);
  const stateOf = (core: MapCore) => states.get(core.path) ?? STUB;
  const reachOf = (core: MapCore) => {
    const view = views.get(core.path);
    return view ? view.bottom - datumY + 12 : MAP.stub + 12;
  };

  return (
    <div className="relative" style={{ width: layout.width, height }}>
      {layout.dirs.map((d) => (
        <p
          key={d.key}
          className={`absolute top-0 border-t-2 pt-1.5 font-li-mono text-[12px] whitespace-nowrap transition-colors motion-reduce:transition-none ${
            focused && (focused.dir || "./") !== d.key
              ? "border-li-neutral-500 text-li-text-muted"
              : "border-li-ink text-li-ink"
          }`}
          style={{ left: d.left, width: d.width }}
          title={d.label === d.key ? undefined : d.key}
        >
          <span className="block w-max truncate" style={{ maxWidth: d.room }}>
            {d.label}
          </span>
        </p>
      ))}

      <p
        className="absolute w-9 text-right font-li-mono text-[10px] leading-[1.15] font-medium text-li-datum-ink"
        style={{ left: 0, top: datumY - (label ? 62 : 26) }}
      >
        ±0
        <br />
        HEAD
      </p>
      {label && (
        <p
          className="absolute w-9 text-right font-li-mono text-[9.5px] leading-[1.25] text-li-datum-ink"
          style={{ left: 0, top: datumY - 38 }}
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
        scale.ticks.map((t) => (
          <p
            key={t.label}
            aria-hidden
            className="absolute w-9 text-right font-li-mono text-[10.5px] text-li-neutral-800"
            style={{ left: 0, top: datumY + t.offset - 7 }}
          >
            {t.label}
          </p>
        ))}

      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-visible"
        width={layout.width}
        height={height}
      >
        {focused && (
          <rect
            x={focused.x - layout.step / 2 + (layout.mode === "sparse" ? 6 : 2)}
            y={datumY + 1}
            width={layout.step - (layout.mode === "sparse" ? 12 : 4)}
            height={reachOf(focused) + 14}
            className="fill-li-steel-100"
          />
        )}
        {scale && mapped.length > 0 && (
          <>
            {scale.breakAt === null ? (
              <line
                x1={MAP.axisX}
                x2={MAP.axisX}
                y1={datumY}
                y2={datumY + depthPx + 24}
                className="stroke-li-neutral-500"
              />
            ) : (
              <>
                <line
                  x1={MAP.axisX}
                  x2={MAP.axisX}
                  y1={datumY}
                  y2={datumY + scale.breakAt - BREAK_HALF}
                  className="stroke-li-neutral-500"
                />
                <ScaleBreakMark x={MAP.axisX} y={datumY + scale.breakAt} />
                <line
                  x1={MAP.axisX}
                  x2={MAP.axisX}
                  y1={datumY + scale.breakAt + BREAK_HALF}
                  y2={datumY + depthPx + 24}
                  className="stroke-li-neutral-500"
                />
              </>
            )}
            {scale.ticks.map((t) => (
              <line
                key={t.label}
                x1={MAP.axisX}
                x2={MAP.axisX + 8}
                y1={datumY + t.offset}
                y2={datumY + t.offset}
                className="stroke-li-neutral-500"
              />
            ))}
          </>
        )}
        <DatumRule x1={MAP.axisX} x2={layout.width} y={datumY} />
        {layout.cores.map((c) => (
          <CoreGraphic
            key={c.path}
            x={c.x}
            datumY={datumY}
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
              layout={layout}
              opacity={hidden(c) ? 0.15 : 1}
              muted={muted(c)}
              focused={focus === c.path}
              label={coreLabel(c, stateOf(c).status, view)}
              reach={reachOf(c)}
              age={view ? `${view.cut ? "≥ " : ""}${shortAge(view.oldestDays)}` : null}
              onOpen={() => onOpen(c.path)}
              onFocus={() => onFocus(c.path)}
            />
          );
        })}
      </ul>

      {card && focused && (
        <MapCard
          core={focused}
          left={
            focused.x + MAP.cardGap + MAP.cardWidth > layout.width
              ? focused.x - MAP.cardGap - MAP.cardWidth
              : focused.x + MAP.cardGap
          }
          top={datumY + MAP.cardTop}
          facts={
            views.get(focused.path)
              ? historyFacts(views.get(focused.path)!)
              : statusFacts(stateOf(focused).status)
          }
          history={views.get(focused.path) ?? null}
          shares={views.get(focused.path) ? historyShares(views.get(focused.path)!) : null}
          why={whyShown(focused.reason, recentCommits)}
          note={
            views.get(focused.path)
              ? `${MOVED_LINES} Click to open and pick a line.`
              : "Click to open and pick a line."
          }
        />
      )}
    </div>
  );
}
