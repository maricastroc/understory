import type { ShownFile } from "@git-investigator/core/types";
import { MAP } from "./map-geometry";
import type { MapCore, MapDir, MapLayout } from "./types";

function split(path: string): { dir: string; name: string } {
  const at = path.lastIndexOf("/");
  return at < 0
    ? { dir: "", name: path }
    : { dir: path.slice(0, at + 1), name: path.slice(at + 1) };
}

export function layoutMap(
  files: ShownFile[],
  width: number,
  caseCounts: ReadonlyMap<string, number>,
): MapLayout {
  const groups = new Map<string, ShownFile[]>();
  for (const f of files) {
    const { dir } = split(f.path);
    const list = groups.get(dir);
    if (list) list.push(f);
    else groups.set(dir, [f]);
  }

  const gaps = Math.max(0, groups.size - 1) * MAP.dirGap;
  const spans = Math.max(1, files.length - 1);
  const fit = (width - MAP.firstX - MAP.rightPad - gaps) / spans;
  const step = Math.max(MAP.minStep, Math.min(MAP.step, fit));

  const dirs: MapDir[] = [];
  const cores: MapCore[] = [];
  let x = MAP.firstX;
  for (const [dir, list] of groups) {
    const start = x;
    const sorted = [...list].sort((a, b) => split(a.path).name.localeCompare(split(b.path).name));
    for (const f of sorted) {
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
    dirs.push({ key: dir || "./", label: dir || "./", left: start - 10, width: last - start + 40 });
    x = last + step + MAP.dirGap;
  }

  const right = cores.length ? cores[cores.length - 1].x + MAP.rightPad : width;
  return { dirs, cores, width: Math.max(width, right) };
}
