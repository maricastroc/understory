import { dateLine, displayId, labelTitle } from "../copy/artifact-copy";
import { artifactStatus } from "../copy/drawer-copy";
import { gapId, gapLetter, gapStatus, gapTitle } from "../copy/gap-copy";
import type { EvidenceEntry } from "../copy/types";
import type { ViewClause } from "../model/types";
import { EvidenceLetter } from "../parts/EvidenceLetter";

function clauseRefs(ids: string[], clauses: ViewClause[]): string {
  const n = clauses.filter((c) => ids.includes(c.id)).map((c) => `clause ${c.index + 1}`);
  return n.length ? n.join(", ") : "—";
}

export function DrawerList({
  entries,
  clauses,
  active,
  onInspect,
  aside,
}: {
  entries: EvidenceEntry[];
  clauses: ViewClause[];
  active: Set<string> | null;
  onInspect: (id: string) => void;
  aside?: (entry: EvidenceEntry) => string | null;
}) {
  return (
    <ul className="flex flex-col">
      {entries.map((entry) => {
        const dim =
          active !== null &&
          !active.has(entry.type === "artifact" ? entry.artifact.id : entry.gap.afterId);
        const text = dim ? "text-li-text-muted" : "text-li-ink";
        if (entry.type === "gap") {
          const { gap, after } = entry;
          return (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => onInspect(entry.id)}
                className="grid w-full cursor-pointer grid-cols-[22px_minmax(0,1fr)] gap-2.5 border-b border-li-divider px-4 py-3 text-left hover:bg-li-neutral-200 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-li-steel"
              >
                <EvidenceLetter
                  letter={gapLetter(gap)}
                  variant={gap.verified ? "gap" : "unverified"}
                />
                <span className="flex flex-col gap-0.5">
                  <span className="flex gap-2 font-li-mono text-[11px]">
                    <span className={`font-medium ${text}`}>{gapId(gap, after)}</span>
                    {aside && <span className="ml-auto text-li-text-subtle">{aside(entry)}</span>}
                  </span>
                  <span className={`text-[13.5px] ${text}`}>{gapTitle(gap)}</span>
                  <span
                    className={`text-xs ${gap.verified ? "text-li-gap-ink" : "text-li-text-subtle"}`}
                  >
                    {gapStatus(gap)}
                  </span>
                </span>
              </button>
            </li>
          );
        }
        const a = entry.artifact;
        const status = artifactStatus(a, clauses);
        return (
          <li key={entry.id}>
            <button
              type="button"
              onClick={() => onInspect(entry.id)}
              className="grid w-full cursor-pointer grid-cols-[22px_minmax(0,1fr)] gap-2.5 border-b border-li-divider px-4 py-3 text-left hover:bg-li-neutral-200 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-li-steel"
            >
              <EvidenceLetter
                letter={a.letter}
                variant={dim ? "dimmed" : a.role === "cited" ? "cited" : "supporting"}
              />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="flex gap-2 font-li-mono text-[11px]">
                  <span className={`font-medium ${text}`}>{displayId(a)}</span>
                  <span className="text-li-text-subtle">{dateLine(a)}</span>
                  {aside && <span className="ml-auto text-li-text-subtle">{aside(entry)}</span>}
                </span>
                <span className={`text-[13.5px] ${text}`}>{labelTitle(a)}</span>
                <span
                  className={`text-xs ${
                    status.tone === "evidence" && !dim
                      ? "text-li-evidence-ink"
                      : "text-li-text-subtle"
                  }`}
                >
                  {aside ? status.text : `${status.text} · ${clauseRefs(a.citedBy, clauses)}`}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
