import { markTone } from "./depth";
import type { LegendKey } from "./MapLegend";
import type { CoreState, MapLayout } from "./types";

export function legendKeys(
  layout: MapLayout,
  states: ReadonlyMap<string, CoreState>,
  broken = false,
): Set<LegendKey> {
  const keys = new Set<LegendKey>();
  if (broken) keys.add("break");
  for (const core of layout.cores) {
    const state = states.get(core.path);
    if (core.cases > 0) keys.add("cases");
    if (
      !state ||
      state.status === "stub" ||
      state.status === "unavailable" ||
      state.status === "too-large"
    ) {
      keys.add("stub");
    } else if (state.status === "mapping") {
      keys.add("mapping");
    } else if (state.history) {
      for (const m of state.history.marks) keys.add(markTone(m.prLookup));
    }
  }
  return keys;
}
