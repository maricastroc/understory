import type { FileHistory, TreeOverview } from "@git-investigator/core/types";
import { shortAge } from "../../line-investigation/format/age";
import { markTone } from "./depth";
import type { CoreHistory } from "./types";

const pct = (part: number, whole: number) => {
  if (!whole || !part) return "0%";
  const p = Math.round((100 * part) / whole);
  return p === 0 ? "<1%" : `${p}%`;
};
const files = (n: number) => `${n} mapped file${n === 1 ? "" : "s"}`;

export function shareLine(histories: FileHistory[], prData: TreeOverview["prData"]): string | null {
  if (prData === "none") return "PR data unavailable for this repo";
  const mapped = histories.filter((h) => h.status === "mapped");
  if (mapped.length === 0) return null;
  const lines = { found: 0, none: 0, unknown: 0 };
  for (const h of mapped) for (const m of h.marks) lines[markTone(m.prLookup)] += m.lines;
  const checked = lines.found + lines.none;
  const all = checked + lines.unknown;
  if (checked === 0) return `PR lookups unavailable for the ${files(mapped.length)}`;
  const unknown = lines.unknown ? ` · ${pct(lines.unknown, all)} not checked` : "";
  return `${pct(lines.found, checked)} of lines in ${files(mapped.length)} have a PR${unknown}`;
}

export function historyFacts(view: CoreHistory): string {
  const age = `${view.cut ? "≥ " : ""}${shortAge(view.oldestDays)}`;
  const commits = `${view.commits} commit${view.commits === 1 ? "" : "s"}`;
  const own = view.commits === 1 ? "owns" : "own";
  const cut = view.cut ? " History cut at clone depth." : "";
  return `Oldest surviving line: ${age}. ${commits} ${own} its ${view.lines} lines at HEAD.${cut}`;
}

export function historyShares(view: CoreHistory): string {
  const total = view.shares.found + view.shares.none + view.shares.unknown;
  const parts = [
    view.shares.found ? `${pct(view.shares.found, total)} PR` : "",
    view.shares.none ? `${pct(view.shares.none, total)} no PR` : "",
    view.shares.unknown ? `${pct(view.shares.unknown, total)} not checked` : "",
  ].filter(Boolean);
  return `${parts.join(" · ")} (of lines)`;
}
