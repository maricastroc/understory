import type { FileHistory, TreeOverview } from "@understory/core/types";
import { shortAge } from "../../line-investigation/format/age";
import { markTone } from "./depth";
import type { CoreHistory } from "./types";

function percents(parts: number[]): string[] {
  const whole = parts.reduce((sum, n) => sum + n, 0);
  if (!whole) return parts.map(() => "0%");
  const exact = parts.map((n) => (100 * n) / whole);
  const rounded = exact.map(Math.floor);
  let left = 100 - rounded.reduce((sum, n) => sum + n, 0);
  const byRemainder = exact
    .map((e, i) => ({ i, rest: e - Math.floor(e) }))
    .sort((a, b) => b.rest - a.rest);
  for (const { i } of byRemainder) {
    if (left <= 0) break;
    rounded[i] += 1;
    left -= 1;
  }
  return parts.map((n, i) => {
    if (!n) return "0%";
    if (rounded[i] === 0) return "<1%";
    if (rounded[i] === 100 && n < whole) return ">99%";
    return `${rounded[i]}%`;
  });
}

const files = (n: number) => `${n} mapped file${n === 1 ? "" : "s"}`;

function tallyLines(histories: FileHistory[]) {
  const mapped = histories.filter((h) => h.status === "mapped");
  const lines = { found: 0, none: 0, unknown: 0 };
  for (const h of mapped) for (const m of h.marks) lines[markTone(m.prLookup)] += m.lines;
  return { mapped: mapped.length, ...lines, checked: lines.found + lines.none };
}

export function shareLine(histories: FileHistory[], prData: TreeOverview["prData"]): string | null {
  if (prData === "none") return null;
  const t = tallyLines(histories);
  if (t.mapped === 0 || t.checked === 0) return null;
  const [found, , unknown] = percents([t.found, t.none, t.unknown]);
  const notChecked = t.unknown ? ` · ${unknown} not checked` : "";
  return `${found} of lines in ${files(t.mapped)} have a PR${notChecked}`;
}

export function prAbsence(histories: FileHistory[], prData: TreeOverview["prData"]): string | null {
  if (prData === "none") {
    return "PR data is unavailable for this repo (no GitHub remote or token), so every mark reads “not checked”.";
  }
  const t = tallyLines(histories);
  if (t.mapped > 0 && t.checked === 0)
    return `PR lookups were unavailable for the ${files(t.mapped)}.`;
  return null;
}

export function historyFacts(view: CoreHistory): string {
  const age = `${view.cut ? "≥ " : ""}${shortAge(view.oldestDays)}`;
  const commits = `${view.commits} commit${view.commits === 1 ? "" : "s"}`;
  const own = view.commits === 1 ? "owns" : "own";
  const cut = view.cut ? " History cut at clone depth." : "";
  return `Oldest surviving line: ${age}. ${commits} ${own} its ${view.lines} lines at HEAD.${cut}`;
}

export function historyShares(view: CoreHistory): string {
  const { found, none, unknown } = view.shares;
  const [foundPct, nonePct, unknownPct] = percents([found, none, unknown]);
  const parts = [
    found ? `${foundPct} PR` : "",
    none ? `${nonePct} no PR` : "",
    unknown ? `${unknownPct} not checked` : "",
  ].filter(Boolean);
  return `${parts.join(" · ")} (of lines)`;
}
