import { longAge } from "../../line-investigation/format/age";
import type { CoreHistory, CoreStatus, MapCore } from "./types";

export function coreLabel(core: MapCore, status: CoreStatus, history: CoreHistory | null): string {
  const cases = core.cases ? `, ${core.cases} case${core.cases === 1 ? "" : "s"}` : "";
  const state =
    status === "mapped" && history
      ? `oldest surviving line ${history.cut ? "at least " : ""}${longAge(history.oldestDays)}`
      : status === "mapping"
        ? "mapping its history"
        : status === "unavailable"
          ? "history unavailable"
          : status === "too-large"
            ? "too large to map"
            : "history not mapped yet";
  return `${core.dir}${core.name}, ${state}${cases}`;
}

export function statusFacts(status: CoreStatus): string {
  if (status === "mapping") return "Mapping its blame…";
  if (status === "unavailable")
    return "History unavailable. It can still be opened and investigated.";
  if (status === "too-large") return "Too large to map. It can still be opened and investigated.";
  return "History not mapped yet.";
}

export const MOVED_LINES = "Lines moved from other files show the move commit.";
