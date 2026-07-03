import type { Artifact } from "@/lib/types";
import { fmtDate } from "./format";
import { KindIcon, kindLabel } from "./icons";
import { SectionLabel } from "./ui";

export function Timeline({ artifacts, citedIds }: { artifacts: Artifact[]; citedIds: Set<string> }) {
  const last = artifacts.length - 1;

  return (
    <section className="mt-7">
      <SectionLabel title="Timeline" meta="The chain that shaped this line, oldest first" />
      <ol>
        {artifacts.map((a, i) => {
          const isLast = i === last;
          const cited = citedIds.has(a.id);
          const dotTone = isLast
            ? "border-accent text-accent"
            : cited
              ? "border-accent/50 text-ink-2"
              : "border-line-2 text-ink-2";

          return (
            <li key={a.id} className="relative flex gap-4 pb-6 last:pb-0">
              {/* rail */}
              <div className="relative flex w-6 shrink-0 justify-center">
                {!isLast && (
                  <span className="absolute left-1/2 top-6 h-[calc(100%-1.5rem)] w-px -translate-x-1/2 bg-line-2" />
                )}
                <span
                  className={`relative z-10 grid size-[22px] place-items-center rounded-full border bg-surface ${dotTone}`}
                >
                  <KindIcon kind={a.kind} className="size-3" />
                </span>
              </div>

              {/* content */}
              <div className="min-w-0 flex-1 pb-0.5">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="tnum font-mono text-[11.5px] text-ink-3">{fmtDate(a.date)}</span>
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink-3">
                    {kindLabel[a.kind]}
                  </span>
                  {isLast && <span className="text-[10.5px] font-semibold text-accent-press">· current</span>}
                </div>
                <div className="mt-1 text-[14px] font-semibold leading-snug text-ink">{a.title}</div>
                <div className="mt-0.5 text-[12.5px] text-ink-2">
                  <span className="font-mono text-ink-3">{a.ref ?? a.id}</span>
                  {a.author?.name && <span> · {a.author.name}</span>}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
