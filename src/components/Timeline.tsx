"use client";

import { useState } from "react";
import type { Artifact } from "@/lib/types";
import { fmtDate } from "./format";
import { KindIcon, kindLabel } from "./icons";
import { Avatar, SectionLabel } from "./ui";

export function Timeline({
  artifacts,
  citedIds,
}: {
  artifacts: Artifact[];
  citedIds: Set<string>;
}) {
  const last = artifacts.length - 1;

  const citedIdxs = artifacts.map((a, i) => (citedIds.has(a.id) ? i : -1)).filter((i) => i >= 0);

  const firstCited = citedIdxs[0] ?? -1;

  const lastCited = citedIdxs[citedIdxs.length - 1] ?? -1;

  const citedCount = citedIdxs.length;

  const COLLAPSED_COUNT = 5;

  const collapsible = artifacts.length > COLLAPSED_COUNT + 1;

  const [expanded, setExpanded] = useState(false);

  const startIdx = collapsible && !expanded ? artifacts.length - COLLAPSED_COUNT : 0;
  
  const visible = artifacts.slice(startIdx);

  return (
    <section className="mt-8">
      <SectionLabel
        title="Provenance timeline"
        meta="PR → commit → review → merge — the chain that shaped this line, oldest first"
      />

      <div className="rounded-xl border border-line bg-surface px-5 py-5 shadow-card">
        {citedCount > 0 && (
          <div className="mb-4 flex items-center gap-2 border-b border-line pb-3 text-[12px] text-ink-2">
            <span className="inline-block h-0.75 w-6 rounded-full bg-accent" />
            <span>
              <b className="font-semibold text-ink">{citedCount}</b> of {artifacts.length} on the
              provenance chain
            </span>
          </div>
        )}

        {collapsible && !expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="mb-4 inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-line bg-inset px-2.5 py-1.5 text-[12px] font-medium text-ink-2 transition-colors hover:border-accent/40 hover:text-accent-press"
          >
            Show all {artifacts.length} changes
            <span className="text-ink-3">· {startIdx} earlier hidden</span>
          </button>
        )}

        <ol>
          {visible.map((a, k) => {
            const i = startIdx + k;
            const isLast = i === last;
            const cited = citedIds.has(a.id);

            const belowOnChain = i >= firstCited && i < lastCited && firstCited >= 0;
            const onChainSpan = firstCited >= 0 && i >= firstCited && i <= lastCited;

            const node = isLast
              ? "border-2 border-accent bg-accent-tint text-accent-press"
              : cited
                ? "border-accent bg-accent text-white"
                : onChainSpan
                  ? "border-accent/40 bg-surface text-accent-press"
                  : "border-line-2 bg-surface text-ink-3";

            return (
              <li
                key={a.id}
                className="relative flex rise gap-4 pb-7 last:pb-0"
                style={{ animationDelay: `${k * 55}ms` }}
              >
                <div className="relative flex w-7 shrink-0 justify-center">
                  {!isLast && (
                    <span
                      className={`absolute top-7 left-1/2 h-[calc(100%-1.75rem)] w-0.5 -translate-x-1/2 rounded-full ${
                        belowOnChain ? "bg-accent/45" : "bg-line-2"
                      }`}
                    />
                  )}
                  <span
                    className={`relative z-10 grid size-7 place-items-center rounded-full ${node}`}
                  >
                    <KindIcon kind={a.kind} className="size-3.5" />
                  </span>
                </div>

                <div className="min-w-0 flex-1 pb-0.5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-[10.5px] font-semibold tracking-[0.06em] text-ink-3 uppercase">
                      {kindLabel[a.kind]}
                    </span>
                    {cited && (
                      <span className="inline-flex h-4.25 items-center rounded-full bg-accent-tint px-1.5 text-[10px] font-semibold tracking-wide text-accent-press uppercase">
                        On chain
                      </span>
                    )}
                    {isLast && (
                      <span className="text-[10.5px] font-semibold text-accent-press">
                        · current
                      </span>
                    )}
                    <span className="ml-auto font-mono text-[11.5px] text-ink-3 tnum">
                      {fmtDate(a.date)}
                    </span>
                  </div>

                  <div className="mt-1 text-[14px] leading-snug font-semibold text-ink">
                    {a.title}
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-ink-2">
                    <span className="font-mono text-ink-3">{a.ref ?? a.id}</span>
                    {a.author?.name && (
                      <>
                        <span className="size-0.75 rounded-full bg-line-2" />
                        <Avatar name={a.author.name} size={18} />
                        <span>{a.author.name}</span>
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        {collapsible && expanded && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="mt-1 inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-line bg-inset px-2.5 py-1.5 text-[12px] font-medium text-ink-2 transition-colors hover:border-accent/40 hover:text-accent-press"
          >
            Show less
          </button>
        )}
      </div>
    </section>
  );
}
