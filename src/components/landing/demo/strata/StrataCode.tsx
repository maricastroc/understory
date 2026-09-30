import type { CodeSegment, LineRange } from "../../../line-investigation/specimen/types";

type Tone = "datum" | "context" | "past";

const KEYWORD: Record<Tone, string> = {
  datum: "text-strata-keyword",
  context: "text-strata-keyword-dim",
  past: "",
};

const MARK: Record<Tone, string> = {
  datum: "bg-strata-bore text-white outline-2 outline-offset-1 outline-strata-ink outline-solid",
  context: "",
  past: "bg-transparent text-strata-bore-ink outline-[1.5px] outline-offset-1 outline-strata-bore outline-dashed",
};

function split(segments: CodeSegment[], mark: LineRange | null) {
  const parts: Array<{ text: string; kind: CodeSegment["kind"]; marked: boolean }> = [];
  let offset = 0;
  for (const s of segments) {
    const [start, end] = [offset, offset + s.text.length];
    offset = end;
    const cuts = mark
      ? [
          start,
          Math.min(end, Math.max(start, mark.start)),
          Math.min(end, Math.max(start, mark.end)),
          end,
        ]
      : [start, end];
    for (let i = 0; i < cuts.length - 1; i++) {
      if (cuts[i + 1] <= cuts[i]) continue;
      parts.push({
        text: s.text.slice(cuts[i] - start, cuts[i + 1] - start),
        kind: s.kind,
        marked: !!mark && cuts[i] >= mark.start && cuts[i + 1] <= mark.end,
      });
    }
  }
  return parts;
}

export function StrataCode({
  segments,
  mark,
  tone,
}: {
  segments: CodeSegment[];
  mark: LineRange | null;
  tone: Tone;
}) {
  return (
    <code className="font-[inherit] whitespace-pre">
      {split(segments, mark).map((p, i) =>
        p.marked ? (
          <mark key={i} className={MARK[tone]}>
            {p.text}
          </mark>
        ) : (
          <span key={i} className={p.kind === "keyword" ? KEYWORD[tone] : undefined}>
            {p.text}
          </span>
        ),
      )}
    </code>
  );
}
