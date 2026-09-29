import type { ShownFile } from "@git-investigator/core/types";
import { MAP, SPARSE } from "./map-geometry";
import type { MapCore, MapDir, MapLayout } from "./types";

function split(path: string): { dir: string; name: string } {
  const at = path.lastIndexOf("/");
  return at < 0
    ? { dir: "", name: path }
    : { dir: path.slice(0, at + 1), name: path.slice(at + 1) };
}

function segments(dir: string): string[] {
  return dir.split("/").filter(Boolean);
}

const fits = (label: string, width: number) => label.length * MAP.dirChar <= width;

const TILT = (40 * Math.PI) / 180;

function labelReach(name: string): number {
  return Math.ceil(Math.min(MAP.labelMax, name.length * MAP.dirChar + 4) * Math.cos(TILT));
}

function dirLabels(dirs: string[], widths: number[]): string[] {
  const all = dirs.map(segments);
  const tail = (segs: string[], k: number) => segs.slice(-k).join("/");
  return all.map((segs, i) => {
    if (segs.length === 0) return "./";
    const full = `${segs.join("/")}/`;
    if (fits(full, widths[i])) return full;
    const shared = (k: number) =>
      all.some((other, j) => j !== i && other.length >= k && tail(other, k) === tail(segs, k));
    let unique = 1;
    while (unique < segs.length && shared(unique)) unique += 1;
    if (unique === segs.length) return full;
    for (let k = segs.length - 1; k > unique; k -= 1) {
      const label = `…/${tail(segs, k)}/`;
      if (fits(label, widths[i])) return label;
    }
    return `…/${tail(segs, unique)}/`;
  });
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
  tail: number = MAP.rightPad,
): { dirs: MapDir[]; cores: MapCore[]; end: number } {
  const placed: Omit<MapDir, "label">[] = [];
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
    x = last + step + MAP.dirGap;
    placed.push({
      key: dir || "./",
      left: start - reach,
      width: last - start + reach + Math.max(30, reach),
      room: x - start - MAP.dirLabelGap,
    });
  }
  const end = x - step - MAP.dirGap;
  const final = placed.at(-1);
  if (final) final.room = Math.min(final.room, end + tail - final.left);
  const labels = dirLabels(
    [...groups.keys()],
    placed.map((d) => d.room),
  );
  return {
    dirs: placed.map((d, i) => ({ ...d, label: labels[i] })),
    cores,
    end,
  };
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
    const tail = step / 2 + 12;
    const { dirs, cores, end } = place(groups, step, caseCounts, firstX, tabHalf, tail);
    return { dirs, cores, width: end + tail, mode: "sparse", step, datumY: SPARSE.datumY };
  }

  const lastName = split([...groups.values()].at(-1)?.at(-1)?.path ?? "").name;
  const pad = Math.max(MAP.rightPad, labelReach(lastName));
  const fit = (available - MAP.firstX - pad - gaps) / spans;
  const step = Math.max(MAP.minStep, Math.min(MAP.step, fit));
  const { dirs, cores } = place(groups, step, caseCounts, MAP.firstX, 10, pad);
  const right = cores.length ? cores[cores.length - 1].x + pad : available;
  return {
    dirs,
    cores,
    width: Math.max(available, right),
    mode: "dense",
    step,
    datumY: MAP.datumY,
  };
}
