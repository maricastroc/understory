import { QuoteBlock } from "../../line-investigation/drawer/QuoteBlock";
import type { ViewArtifact } from "../../line-investigation/model/types";

function paragraphAround(body: string, start: number, end: number) {
  const from = body.lastIndexOf("\n\n", start);
  const to = body.indexOf("\n\n", end);
  const offset = from < 0 ? 0 : from + 2;
  return {
    text: body.slice(offset, to < 0 ? undefined : to),
    range: { start: start - offset, end: end - offset },
  };
}

export function QuoteSpecimen({
  artifact,
  rejected,
}: {
  artifact: ViewArtifact;
  rejected: string[];
}) {
  const quote = artifact.quotes.find((q) => q.range);
  if (!quote?.range) return null;
  const shown = paragraphAround(artifact.source.body, quote.range.start, quote.range.end);
  return (
    <div className="flex flex-col gap-3">
      <QuoteBlock body={shown.text} range={shown.range} tone="verified" />
      <div className="flex flex-col gap-1 text-xs">
        <span className="font-semibold text-li-evidence-ink">
          ✓ Quote found verbatim in {artifact.id}
        </span>
        {rejected.map((id) => (
          <span key={id} className="font-li-mono text-[11.5px] text-li-neutral-700">
            <s>{id}</s> · not in evidence, rejected
          </span>
        ))}
      </div>
    </div>
  );
}
