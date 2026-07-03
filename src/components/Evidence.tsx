import type { Artifact, Evidence as EvidenceT } from "@/lib/types";
import { fmtDate, letter } from "./format";
import { ExternalLink, KindIcon, kindLabel } from "./icons";
import { SectionLabel } from "./ui";

function ExhibitCard({ a, index, cited }: { a: Artifact; index: number; cited: boolean }) {
  const body = a.body.split("\n").slice(1).join("\n").trim(); // message minus subject

  return (
    <div
      className={`flex flex-col gap-2.5 rounded-[10px] border bg-surface p-4 shadow-[0_1px_2px_rgba(20,22,30,0.04)] transition-colors ${
        cited ? "border-accent/40 ring-1 ring-accent-tint" : "border-line"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span className="rounded-md border border-line bg-inset px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-ink-2">
          Exhibit {letter(index)}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-3">
          <KindIcon kind={a.kind} className="size-3.5" />
          {kindLabel[a.kind]}
        </span>
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
            cited ? "bg-good-tint text-good" : "bg-inset text-ink-3"
          }`}
        >
          {cited ? "Cited" : "Supporting"}
        </span>
      </div>

      <div className="text-[14.5px] font-semibold leading-snug text-ink">{a.title}</div>

      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-ink-2">
        <span className="font-mono text-ink-3">{a.ref ?? a.id}</span>
        {a.author?.name && (
          <>
            <span className="size-[3px] rounded-full bg-line-2" />
            <span>{a.author.name}</span>
          </>
        )}
        <span className="size-[3px] rounded-full bg-line-2" />
        <span className="tnum">{fmtDate(a.date)}</span>
      </div>

      {body && (
        <p className="line-clamp-5 whitespace-pre-wrap border-l-2 border-line-2 pl-3 text-[12.5px] leading-relaxed text-ink-2">
          {body}
        </p>
      )}

      {a.url && (
        <div className="mt-0.5 flex items-center border-t border-line pt-2.5">
          <a
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-2 hover:text-accent-press"
          >
            Open source <ExternalLink className="size-3" />
          </a>
        </div>
      )}
    </div>
  );
}

export function Evidence({ evidence, citedIds }: { evidence: EvidenceT; citedIds: Set<string> }) {
  const total = evidence.artifacts.length;
  const citedCount = evidence.artifacts.filter((a) => citedIds.has(a.id)).length;

  return (
    <section className="mt-7 pb-4">
      <SectionLabel
        title="Evidence"
        meta={`${total} exhibit${total !== 1 ? "s" : ""} · ${citedCount} cited · ${total - citedCount} supporting`}
      />
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        {evidence.artifacts.map((a, i) => (
          <ExhibitCard key={a.id} a={a} index={i} cited={citedIds.has(a.id)} />
        ))}
      </div>
    </section>
  );
}
