import type { CoreHistory, MapLayout } from "./types";

export type MapSummary = {
  files: number;
  mapped: number;
  lines: number;
};

export function mapSummary(layout: MapLayout, views: ReadonlyMap<string, CoreHistory>): MapSummary {
  let lines = 0;
  for (const core of layout.cores) lines += views.get(core.path)?.lines ?? 0;
  return { files: layout.cores.length, mapped: views.size, lines };
}
