import { displayId, kindName } from "../../line-investigation/copy/artifact-copy";
import { gapName } from "../../line-investigation/copy/accessible-name";
import type { ViewArtifact, ViewGap } from "../../line-investigation/model/types";
import { listOf } from "./region-copy";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function monthYear(iso: string): string {
  const [y, m] = iso.slice(0, 7).split("-");
  return y && m ? `${MONTHS[Number(m) - 1] ?? m} ${y}` : iso;
}

export function shortMonthYear(iso: string): string {
  const full = monthYear(iso);
  const [month, year] = full.split(" ");
  return year ? `${month.slice(0, 3)} ${year}` : full;
}

export function prArtifactName(a: ViewArtifact, regions: string[], core: string): string {
  const others = regions.filter((r) => r !== core);
  const shared = others.length > 0 ? `, shared with ${listOf(others)}` : "";
  return `${a.letter}, ${kindName(a.kind)} ${displayId(a)}, ${monthYear(a.date)}${shared}`;
}

export function prGapName(gap: ViewGap, after: ViewArtifact): string {
  return `∅, ${gapName(gap, after)}`;
}
