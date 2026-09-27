import type { PrView } from "../../pr-investigation/model/types";

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

export function prDiagramLabel(view: PrView): string {
  const shared = [...view.regionsOf.entries()]
    .filter(([id, regions]) => id.startsWith("pr:") && regions.length > 1)
    .sort((a, b) => b[1].length - a[1].length)[0];
  const silent = view.regions.filter((r) => r.state === "silent").length;
  const rest: string[] = [];
  if (shared) rest.push(`${shared[1].length} share one pull request`);
  if (silent) rest.push(`${silent} end in unrecorded history`);
  const head = plural(view.regions.length, "changed region");
  return rest.length ? `${head}: ${rest.join(", ")}` : head;
}
