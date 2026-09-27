import { shortAge } from "../../line-investigation/format/age";
import { DAY } from "../../line-investigation/layout/geometry";
import { RegionToken } from "../parts/RegionToken";
import { PR_SECTION as G } from "../layout/pr-geometry";
import type { PrSectionLayout } from "../layout/types";
import type { PrView } from "../model/types";
import { SectionAxis } from "./SectionAxis";

const CAPTION =
  "pointer-events-none absolute bg-li-paper px-0.5 font-li-mono text-[10.5px] leading-3.5 whitespace-nowrap";

function span(ids: string[]): string {
  return ids.length > 1 ? `${ids[0]}–${ids[ids.length - 1]}` : ids[0];
}

export function SectionCaptions({ view, layout }: { view: PrView; layout: PrSectionLayout }) {
  const { datumY } = layout;
  const regionOf = new Map(layout.cores.map((c) => [c.key, c.regionIds]));
  const artifactTime = new Map(view.artifacts.map((a) => [a.id, Date.parse(a.date)]));
  const deepest = [...layout.issues].sort((a, b) => b.y - a.y)[0];
  const lastSilent = [...layout.hatches].sort((a, b) => b.x - a.x)[0];

  return (
    <>
      <SectionAxis view={view} layout={layout} />
      {layout.cores.map((c) => (
        <span
          key={`tab-${c.key}`}
          className="pointer-events-none absolute"
          style={{
            left: c.x - G.tabWidth / 2,
            top: datumY - G.tabGap - G.tabHeight,
            width: G.tabWidth,
          }}
        >
          <RegionToken
            id={c.label}
            state={c.state}
            className="block h-5 w-full bg-li-paper leading-4.5"
          />
        </span>
      ))}
      {layout.bands.map((b) => (
        <span
          key={`band-${b.id}`}
          aria-hidden
          className={`${CAPTION} text-li-neutral-700`}
          style={{ left: b.x2 + 6, top: (b.top + b.bottom) / 2 - 7 }}
        >
          {b.id} · shared by {span(b.cores.flatMap((k) => regionOf.get(k) ?? []))}
        </span>
      ))}
      {layout.issues.map((i) => {
        const time = artifactTime.get(i.id);
        const depth =
          i === deepest && time !== undefined
            ? ` · ${shortAge((view.datum.time - time) / DAY)} deep`
            : "";
        return (
          <span
            key={`issue-${i.id}-${i.x}`}
            aria-hidden
            className={`${CAPTION} text-li-neutral-700`}
            style={{ left: i.x + 14, top: i.y - 7 }}
          >
            {i.id}
            {depth}
          </span>
        );
      })}
      {lastSilent && (
        <span
          aria-hidden
          className={`${CAPTION} text-li-gap-ink`}
          style={{
            left: lastSilent.x + G.hatchWidth / 2 + 6,
            top: lastSilent.top + lastSilent.height - 14,
          }}
        >
          not recorded
        </span>
      )}
    </>
  );
}
