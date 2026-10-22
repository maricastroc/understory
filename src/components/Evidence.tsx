import type { Artifact, Evidence as EvidenceT } from "@understory/core/types";
import { formatDay } from "@/i18n/format";
import { useMessages } from "@/i18n/LocaleProvider";
import { letter } from "./format";
import { ExternalLink, KindIcon, Search } from "./icons";
import { SectionLabel } from "./ui";

function ExhibitCard({
  a,
  index,
  cited,
  onDrill,
}: {
  a: Artifact;
  index: number;
  cited: boolean;
  onDrill?: (a: Artifact) => void;
}) {
  const m = useMessages();
  const r = m.report;
  const question = m.questions.anchor[a.kind];
  const body = a.body.split("\n").slice(1).join("\n").trim();

  return (
    <div
      className={`flex flex-col gap-2.5 rounded-[10px] border bg-surface p-4 shadow-card transition-colors ${
        cited ? "border-accent/40 ring-1 ring-accent-tint" : "border-line"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span className="rounded-md border border-line bg-inset px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-ink-2">
          {r.exhibit(letter(index))}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-ink-3 uppercase">
          <KindIcon kind={a.kind} className="size-3.5" />
          {r.kind[a.kind]}
        </span>
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
            cited ? "bg-good-tint text-good" : "bg-inset text-ink-3"
          }`}
        >
          {cited ? r.evidence.cited : r.evidence.supporting}
        </span>
      </div>

      <div className="text-[14.5px] leading-snug font-semibold text-ink">{a.title}</div>

      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-ink-2">
        <span className="font-mono text-ink-3">{a.ref ?? a.id}</span>
        {a.author?.name && (
          <>
            <span className="size-0.75 rounded-full bg-line-2" />
            <span>{a.author.name}</span>
          </>
        )}
        <span className="size-0.75 rounded-full bg-line-2" />
        <span className="tnum">{formatDay(m.time, a.date)}</span>
      </div>

      {body && (
        <p className="line-clamp-5 border-l-2 border-line-2 pl-3 text-[12.5px] leading-relaxed whitespace-pre-wrap text-ink-2">
          {body}
        </p>
      )}

      {(onDrill || a.url) && (
        <div className="mt-0.5 flex flex-col gap-2 border-t border-line pt-2.5">
          {onDrill && (
            <button
              type="button"
              onClick={() => onDrill(a)}
              title={r.evidence.drillTitle(question, r.kind[a.kind].toLowerCase())}
              className="flex w-fit max-w-full cursor-pointer items-start gap-1.5 rounded-md border border-accent/30 px-2.5 py-1.5 text-left text-[12px] font-medium text-accent-press transition-colors hover:border-accent/50 hover:bg-accent-tint"
            >
              <Search className="mt-0.5 size-3 shrink-0" />
              <span>
                <span className="text-ink-3">{r.evidence.investigate}</span> {question}
              </span>
            </button>
          )}
          {a.url && (
            <a
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 self-end text-[12px] font-medium text-ink-2 hover:text-accent-press"
            >
              {m.artifact.openSource} <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export function Evidence({
  evidence,
  citedIds,
  onDrill,
}: {
  evidence: EvidenceT;
  citedIds: Set<string>;
  onDrill?: (a: Artifact) => void;
}) {
  const total = evidence.artifacts.length;
  const citedCount = evidence.artifacts.filter((a) => citedIds.has(a.id)).length;
  const e = useMessages().report.evidence;

  return (
    <section className="mt-7 pb-4">
      <SectionLabel title={e.title} meta={e.meta(total, citedCount, total - citedCount)} />
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        {evidence.artifacts.map((a, i) => (
          <ExhibitCard key={a.id} a={a} index={i} cited={citedIds.has(a.id)} onDrill={onDrill} />
        ))}
      </div>
    </section>
  );
}
