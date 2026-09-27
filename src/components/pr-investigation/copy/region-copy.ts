import type { PrRegion, RegionState } from "../model/types";

const STATE_WORD: Record<RegionState, string> = {
  explained: "explained",
  partial: "partly recorded",
  silent: "not recorded",
  unexplained: "no reconstruction",
};

export function rangeText(r: PrRegion): string {
  return r.range.start === r.range.end ? `${r.range.start}` : `${r.range.start}–${r.range.end}`;
}

export function deltaText(r: PrRegion): string | null {
  if (!r.hunk) return null;
  return [r.hunk.added ? `+${r.hunk.added}` : null, r.hunk.removed ? `−${r.hunk.removed}` : null]
    .filter(Boolean)
    .join(" ");
}

export function regionName(r: PrRegion): string {
  const lines =
    r.range.start === r.range.end
      ? `line ${r.range.start}`
      : `lines ${r.range.start} to ${r.range.end}`;
  const delta = r.hunk ? `, ${r.hunk.added} added ${r.hunk.removed} removed` : "";
  return `${r.id}, ${r.path} ${lines}${delta}, ${STATE_WORD[r.state]}`;
}

export function listOf(ids: string[]): string {
  if (ids.length <= 1) return ids.join("");
  return `${ids.slice(0, -1).join(", ")} and ${ids[ids.length - 1]}`;
}

export function regionSpan(ids: string[]): string {
  if (ids.length <= 2) return ids.join(", ");
  const nums = ids.map((id) => Number(id.slice(1)));
  const contiguous = nums.every((n, i) => i === 0 || n === nums[i - 1] + 1);
  return contiguous ? `${ids[0]}–${ids[ids.length - 1]}` : ids.join(", ");
}
