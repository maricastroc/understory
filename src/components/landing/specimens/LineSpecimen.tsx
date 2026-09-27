import { DatumRule } from "../../line-investigation/bore/DatumRule";
import { datumToken } from "../../line-investigation/specimen/datum-token";
import { describeLine } from "../../line-investigation/specimen/describe-line";
import { highlightLines } from "../../line-investigation/specimen/highlight-code";
import { SPECIMEN } from "../../line-investigation/specimen/specimen-metrics";
import { SpecimenLine } from "../../line-investigation/specimen/SpecimenLine";

export function LineSpecimen({
  lines,
  path,
  line,
  question,
}: {
  lines: string[];
  path: string;
  line: number;
  question: string;
}) {
  const segments = highlightLines(lines, path);
  const rows = [line - 1, line, line + 1].filter((n) => n >= 1 && n <= lines.length);
  const datumY = (rows.indexOf(line) + 1) * SPECIMEN.rowHeight;
  return (
    <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,black_82%,transparent)] font-li-mono text-xs text-li-neutral-800">
      <ol aria-label={`${path}, lines ${rows[0]}–${rows[rows.length - 1]}`}>
        {rows.map((n) => (
          <SpecimenLine
            key={n}
            line={n}
            segments={segments[n - 1] ?? []}
            datum={n === line}
            token={n === line ? datumToken(question, lines[n - 1]) : null}
            bar={undefined}
            description={describeLine(n, n === line, undefined)}
          />
        ))}
      </ol>
      <svg aria-hidden className="pointer-events-none absolute inset-0 size-full overflow-visible">
        <DatumRule x1={0} x2="100%" y={datumY} />
      </svg>
    </div>
  );
}
