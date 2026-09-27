import type { ChangeLine, LineRange, TargetHunk } from "./types";

export const MAX_HUNK_LINES = 40;

export function hunkFor(changes: ChangeLine[], range: LineRange): TargetHunk | undefined {
  const blocks = new Set(
    changes
      .filter(
        (c) => c.kind === "del" && c.old !== null && c.old >= range.start && c.old <= range.end,
      )
      .map((c) => c.block),
  );
  if (blocks.size === 0) return undefined;
  const picked = changes.filter((c) => blocks.has(c.block));
  const lines = picked.map(({ kind, old, new: next, text }) => ({ kind, old, new: next, text }));
  return {
    lines: lines.slice(0, MAX_HUNK_LINES),
    removed: lines.filter((l) => l.kind === "del").length,
    added: lines.filter((l) => l.kind === "add").length,
    omitted: Math.max(0, lines.length - MAX_HUNK_LINES),
  };
}
