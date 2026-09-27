import { BlameBar } from "./BlameBar";
import { CodeText } from "./CodeText";
import type { BlameBarModel, CodeSegment, LineRange } from "./types";

export function SpecimenLine({
  line,
  segments,
  datum,
  token,
  bar,
  description,
}: {
  line: number;
  segments: CodeSegment[];
  datum: boolean;
  token: LineRange | null;
  bar: BlameBarModel | undefined;
  description: string;
}) {
  return (
    <li
      data-line={line}
      data-datum={datum || undefined}
      className={`relative flex h-6.5 w-max min-w-full items-center ${
        datum ? "bg-li-datum-row font-medium text-li-ink" : ""
      }`}
    >
      {datum && <span aria-hidden className="absolute inset-y-0 left-0 w-0.75 bg-li-datum" />}
      <span
        aria-hidden
        className={`w-7.5 shrink-0 text-right ${datum ? "text-li-ink" : "text-li-text-muted"}`}
      >
        {line}
      </span>
      <span aria-hidden className="flex w-13 shrink-0 justify-end pr-1">
        {bar && <BlameBar bar={bar} />}
      </span>
      <span className="sr-only">{description}</span>
      <CodeText segments={segments} token={token} datum={datum} />
    </li>
  );
}
