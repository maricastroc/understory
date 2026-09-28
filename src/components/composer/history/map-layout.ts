import type { ShownFile } from "@git-investigator/core/types";
import { MAP, SPARSE } from "./map-geometry";
import type { MapCore, MapDir, MapLayout } from "./types";

function split(path: string): { dir: string; name: string } {
  const at = path.lastIndexOf("/");
  return at < 0
    ? { dir: "", name: path }
    : { dir: path.slice(0, at + 1), name: path.slice(at + 1) };
}

function group(files: ShownFile[]): Map<string, ShownFile[]> {
  const groups = new Map<string, ShownFile[]>();
  for (const f of files) {
    const { dir } = split(f.path);
    const list = groups.get(dir);
    if (list) list.push(f);
    else groups.set(dir, [f]);
  }
  for (const [dir, list] of groups) {
    groups.set(
      dir,
      [...list].sort((a, b) => split(a.path).name.localeCompare(split(b.path).name)),
    );
  }
  return groups;
}

function place(
  groups: Map<string, ShownFile[]>,
  step: number,
  caseCounts: ReadonlyMap<string, number>,
  firstX: number = MAP.firstX,
  reach = 10,
): { dirs: MapDir[]; cores: MapCore[]; end: number } {
  const dirs: MapDir[] = [];
  const cores: MapCore[] = [];
  let x = firstX;
  for (const [dir, list] of groups) {
    const start = x;
    for (const f of list) {
      cores.push({
        path: f.path,
        dir,
        name: split(f.path).name,
        x,
        reason: f.reason,
        cases: caseCounts.get(f.path) ?? 0,
      });
      x += step;
    }
    const last = x - step;
    dirs.push({
      key: dir || "./",
      label: dir || "./",
      left: start - reach,
      width: last - start + reach + Math.max(30, reach),
    });
    x = last + step + MAP.dirGap;
  }
  return { dirs, cores, end: x - step - MAP.dirGap };
}

export function layoutMap(
  files: ShownFile[],
  available: number,
  caseCounts: ReadonlyMap<string, number>,
): MapLayout {
  const groups = group(files);
  const gaps = Math.max(0, groups.size - 1) * MAP.dirGap;
  const spans = Math.max(1, files.length - 1);

  const sparseRoom = available - SPARSE.panel - SPARSE.gap - MAP.firstX - SPARSE.maxStep / 2 - gaps;
  const sparseFit = files.length <= 1 ? SPARSE.maxStep : sparseRoom / spans;
  if (files.length > 0 && sparseFit >= SPARSE.minStep) {
    const step = Math.min(SPARSE.maxStep, sparseFit);
    const firstX = MAP.axisX + step / 2 + 6;
    const tabHalf = step / 2 - SPARSE.tabInset;
    const { dirs, cores, end } = place(groups, step, caseCounts, firstX, tabHalf);
    return { dirs, cores, width: end + step / 2 + 12, mode: "sparse", step, datumY: SPARSE.datumY };
  }

  const fit = (available - MAP.firstX - MAP.rightPad - gaps) / spans;
  const step = Math.max(MAP.minStep, Math.min(MAP.step, fit));
  const { dirs, cores } = place(groups, step, caseCounts);
  const right = cores.length ? cores[cores.length - 1].x + MAP.rightPad : available;
  return {
    dirs,
    cores,
    width: Math.max(available, right),
    mode: "dense",
    step,
    datumY: MAP.datumY,
  };
}
