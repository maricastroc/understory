import type { CodeSegment, LineRange } from "./types";

function segmentClass(kind: CodeSegment["kind"], datum: boolean): string {
  if (kind === "keyword") return datum ? "text-li-steel-800" : "text-li-steel-700";
  if (kind === "comment") return "text-li-text-muted";
  return "";
}

export function CodeText({
  segments,
  token,
  datum,
}: {
  segments: CodeSegment[];
  token: LineRange | null;
  datum: boolean;
}) {
  const parts: Array<{ text: string; kind: CodeSegment["kind"]; marked: boolean }> = [];
  let offset = 0;
  for (const s of segments) {
    const start = offset;
    const end = offset + s.text.length;
    offset = end;
    const cuts = token
      ? [
          start,
          Math.min(end, Math.max(start, token.start)),
          Math.min(end, Math.max(start, token.end)),
          end,
        ]
      : [start, end];
    for (let i = 0; i < cuts.length - 1; i++) {
      if (cuts[i + 1] <= cuts[i]) continue;
      const marked = !!token && cuts[i] >= token.start && cuts[i + 1] <= token.end;
      parts.push({
        text: s.text.slice(cuts[i] - start, cuts[i + 1] - start),
        kind: s.kind,
        marked,
      });
    }
  }

  return (
    <code className="pr-2 pl-2.5 whitespace-pre">
      {parts.map((p, i) =>
        p.marked ? (
          <mark
            key={i}
            className={`bg-li-datum-strong px-px text-inherit outline-[1.5px] outline-offset-1 outline-li-ink outline-solid ${segmentClass(p.kind, datum)}`}
          >
            {p.text}
          </mark>
        ) : (
          <span key={i} className={segmentClass(p.kind, datum)}>
            {p.text}
          </span>
        ),
      )}
    </code>
  );
}
