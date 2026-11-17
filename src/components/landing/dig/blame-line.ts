import type { BlameLine, DigModel } from "./types";

export function blameLine(model: DigModel): BlameLine {
  const source = model.first.artifact.source;
  const ref = source.ref ?? "";
  const author = source.author?.name ?? "";
  const day = source.date.slice(0, 10);
  const open = `${ref} (`;
  const close = `  ${model.line})  `;
  return {
    ref,
    author,
    day,
    open,
    close,
    command: `git blame -L ${model.line},${model.line} ${model.path}`,
    width: open.length + author.length + 1 + day.length + close.length,
  };
}
