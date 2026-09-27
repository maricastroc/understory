"use client";

import type { HeadCommit } from "@git-investigator/core/types";
import { useState } from "react";
import { DatumRule } from "../../line-investigation/bore/DatumRule";
import { headLabel } from "./head-label";
import { MapCard } from "./MapCard";
import { MapCoreItem } from "./MapCoreItem";
import { MAP } from "./map-geometry";
import { whyShown } from "./scope-copy";
import type { MapCore, MapLayout } from "./types";

const FADE = "transition-opacity duration-150 motion-reduce:transition-none";

function coreLabel(core: MapCore): string {
  const cases = core.cases ? `, ${core.cases} case${core.cases === 1 ? "" : "s"}` : "";
  return `${core.dir}${core.name}, history not mapped yet${cases}`;
}

export function MapCanvas({
  layout,
  head,
  recentCommits,
  matches,
  onOpen,
}: {
  layout: MapLayout;
  head: HeadCommit | null;
  recentCommits: number;
  matches: ReadonlySet<string> | null;
  onOpen: (path: string) => void;
}) {
  const [focus, setFocus] = useState<string | null>(null);
  const height = MAP.datumY + MAP.cardTop + MAP.cardRoom;
  const focused = focus ? layout.cores.find((c) => c.path === focus) : undefined;
  const label = head ? headLabel(head) : null;

  const opacity = (core: MapCore) => {
    if (matches && !matches.has(core.path)) return 0.15;
    if (focused && focused.path !== core.path) return 0.3;
    return 1;
  };

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

      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-visible"
        width={layout.width}
        height={height}
      >
        <DatumRule x1={MAP.axisX} x2={layout.width} y={MAP.datumY} />
        {layout.cores.map((c) => (
          <line
            key={c.path}
            x1={c.x}
            x2={c.x}
            y1={MAP.datumY}
            y2={MAP.datumY + MAP.stub}
            strokeWidth={1.5}
            strokeDasharray="3 3"
            opacity={opacity(c)}
            className={`stroke-li-neutral-500 ${FADE}`}
          />
        ))}
      </svg>

      <ul aria-label="Files shown">
        {layout.cores.map((c) => (
          <MapCoreItem
            key={c.path}
            core={c}
            opacity={opacity(c)}
            focused={focus === c.path}
            label={coreLabel(c)}
            onOpen={() => onOpen(c.path)}
            onFocus={() => setFocus(c.path)}
            onBlur={() => setFocus((f) => (f === c.path ? null : f))}
          />
        ))}
      </ul>

      {focused && (
        <MapCard
          core={focused}
          left={
            focused.x + MAP.cardGap + MAP.cardWidth > layout.width
              ? focused.x - MAP.cardGap - MAP.cardWidth
              : focused.x + MAP.cardGap
          }
          top={MAP.datumY + MAP.cardTop}
          facts="History not mapped yet."
          why={whyShown(focused.reason, recentCommits)}
          note="Click to open and pick a line."
        />
      )}
    </div>
  );
}
