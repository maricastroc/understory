import type { ViewClause } from "../../line-investigation/model/types";
import { EvidenceLetter } from "../../line-investigation/parts/EvidenceLetter";
import { rangeText } from "../copy/region-copy";
import type { PrRegion, PrView } from "../model/types";

function Letters({ clause }: { clause: ViewClause }) {
  return (
    <span className="inline-flex items-center gap-0.5 align-[1px]">
      {clause.letters.map((l) => (
        <EvidenceLetter key={l} letter={l} variant="cited" size="sm" />
      ))}
      {clause.unknownCitations.map((id) => (
        <s key={id} className="font-li-mono text-[10.5px] text-li-text-muted">
          {id}
        </s>
      ))}
    </span>
  );
}

export function RegionWhy({ region, view }: { region: PrRegion; view: PrView }) {
  const whys = region.findings.map((i) => view.findingClauses[i]);
  return (
    <div className="grid grid-cols-[22px_minmax(0,1fr)] gap-1.5 border-t border-li-divider py-2 pr-2 pl-1">
      <span className="pt-0.75 font-li-mono text-[10.5px] text-li-steel-700">{region.id}</span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-li-mono text-[11px] text-li-text-subtle">
          {region.path} · {rangeText(region)}
        </span>
        {view.mode === "evidence-only" ? (
          <span className="text-[15px] leading-[1.4] text-li-text-subtle">No reconstruction</span>
        ) : (
          <>
            {whys.slice(0, 2).map((why) => {
              const text = why.text
                ? `${why.text}${why.silent ? " Not recorded." : ""}`
                : "Not recorded.";
              return (
                <span
                  key={why.id}
                  title={whys.length > 1 ? text : undefined}
                  className={`text-[15px] leading-[1.4] ${whys.length > 1 ? "truncate" : "line-clamp-2"} ${
                    why.silent ? "text-li-gap-ink" : "text-li-ink"
                  }`}
                >
                  {text} <Letters clause={why} />
                </span>
              );
            })}
            {whys.length > 2 && (
              <span className="font-li-mono text-[11px] text-li-text-subtle">
                +{whys.length - 2} more origin commits · All evidence
              </span>
            )}
          </>
        )}
      </span>
    </div>
  );
}
