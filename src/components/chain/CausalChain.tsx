"use client";

import { useState } from "react";
import type { Artifact, ArtifactKind } from "@git-investigator/core/types";
import { Alert, Check, ChevronRight, KindIcon, kindLabel } from "../icons";
import { SectionLabel } from "../ui";
import { type ChainLane, type ChainSlot, useCausalChain } from "./use-causal-chain";

const VISIBLE_LANES = 3;

function StageChip({
  a,
  kind,
  cited,
  extra = 0,
  grow = true,
}: {
  a: Artifact;
  kind: ArtifactKind;
  cited: boolean;
  extra?: number;
  grow?: boolean;
}) {
  const inner = (
    <>
      <div className="flex items-center gap-1.5">
        <span
          className={`grid size-5 shrink-0 place-items-center rounded-md ${
            cited ? "bg-accent text-white" : "bg-inset text-ink-3"
          }`}
        >
          <KindIcon kind={kind} className="size-3" />
        </span>
        <span className="text-[9.5px] font-semibold tracking-[0.08em] text-ink-3 uppercase">
          {kindLabel[kind]}
        </span>
        {cited && (
          <span
            className="ml-auto size-1.5 shrink-0 rounded-full bg-accent"
            title="On the cited chain"
          />
        )}
      </div>
      <div className="font-mono text-[11px] text-ink-3 tnum">
        {a.ref ?? a.id}
        {extra > 0 && <span className="text-ink-3"> +{extra}</span>}
      </div>
      <div className="line-clamp-2 text-[12px] leading-snug font-medium break-words text-ink">
        {a.title}
      </div>
    </>
  );

  const cls = `flex flex-col gap-1 rounded-lg border p-2.5 shadow-card transition-colors ${
    grow ? "min-w-[92px] flex-1" : "w-[200px]"
  } ${cited ? "border-accent/45 bg-surface ring-1 ring-accent-tint" : "border-line bg-surface"}`;

  return a.url ? (
    <a
      href={a.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`${cls} hover:border-accent/50`}
    >
      {inner}
    </a>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

function MissingSlot({ kind, text }: { kind: ArtifactKind; text: string }) {
  return (
    <div className="flex min-w-[92px] flex-1 flex-col justify-center gap-1 rounded-lg border border-dashed border-line-2 bg-surface-2 p-2.5">
      <div className="flex items-center gap-1.5">
        <span className="grid size-5 shrink-0 place-items-center rounded-md bg-inset text-ink-3 opacity-50">
          <KindIcon kind={kind} className="size-3" />
        </span>
        <span className="text-[9.5px] font-semibold tracking-[0.08em] text-ink-3 uppercase">
          {kindLabel[kind]}
        </span>
      </div>
      <div className="text-[11.5px] text-ink-3 italic">{text}</div>
    </div>
  );
}

function Connector() {
  return (
    <div className="flex shrink-0 items-center text-ink-3">
      <ChevronRight className="size-4" />
    </div>
  );
}

function upstream(slot: ChainSlot, kind: ArtifactKind, missing: string, citedIds: Set<string>) {
  return slot.artifact ? (
    <StageChip
      a={slot.artifact}
      kind={kind}
      cited={citedIds.has(slot.artifact.id)}
      extra={slot.extra}
    />
  ) : (
    <MissingSlot kind={kind} text={missing} />
  );
}

function Lane({ lane, citedIds }: { lane: ChainLane; citedIds: Set<string> }) {
  return (
    <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
      {lane.pr.artifact ? (
        <>
          {upstream(lane.issue, "issue", "no issue linked", citedIds)}
          <Connector />
          <StageChip
            a={lane.pr.artifact}
            kind="pull_request"
            cited={citedIds.has(lane.pr.artifact.id)}
            extra={lane.pr.extra}
          />
          <Connector />
          {upstream(lane.review, "review", "no review recorded", citedIds)}
        </>
      ) : (
        <div className="flex min-w-[180px] flex-[3] items-center gap-2 rounded-lg border border-dashed border-line-2 bg-surface-2 p-2.5 text-[11.5px] text-ink-3">
          <Alert className="size-3.5 shrink-0 opacity-70" />
          <span>Committed directly — no pull request, issue, or review in the trail</span>
        </div>
      )}
      <Connector />
      <StageChip a={lane.commit} kind="commit" cited={citedIds.has(lane.commit.id)} />
    </div>
  );
}

function Banner({
  tone,
  icon,
  children,
}: {
  tone: "good" | "warn" | "neutral";
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const toneCls = {
    good: "border-good/25 bg-good-tint text-good",
    warn: "border-warn/30 bg-warn-tint text-warn",
    neutral: "border-line bg-surface-2 text-ink-2",
  }[tone];
  return (
    <div
      className={`mb-4 flex items-start gap-2 rounded-md border px-3 py-2.5 text-[12.5px] ${toneCls}`}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <SectionLabel
        title="Provenance chain"
        meta="Issue → pull request → review → commit — the causal path to this line, and where it breaks"
      />
      <div className="rounded-xl border border-line bg-surface px-5 py-5 shadow-card">
        {children}
      </div>
    </section>
  );
}

export function CausalChain({
  artifacts,
  citedIds,
}: {
  artifacts: Artifact[];
  citedIds: Set<string>;
}) {
  const chain = useCausalChain(artifacts);
  const [expanded, setExpanded] = useState(false);

  if (chain.mode === "empty") return null;

  if (chain.mode === "commits-only") {
    return (
      <Shell>
        <Banner tone="neutral" icon={<Alert className="size-4" />}>
          No pull request, issue, or review was found upstream of these commits — the recorded
          history for this line is the commits themselves.
        </Banner>
        <div className="flex flex-wrap gap-2">
          {chain.commits.map((c) => (
            <StageChip key={c.id} a={c} kind="commit" cited={citedIds.has(c.id)} grow={false} />
          ))}
        </div>
      </Shell>
    );
  }

  if (chain.mode === "grouped") {
    return (
      <Shell>
        <Banner tone="neutral" icon={<Alert className="size-4" />}>
          Structural links aren’t recorded for this saved case — showing the trail grouped by role.
        </Banner>
        <div className="flex flex-wrap gap-x-6 gap-y-4">
          {chain.groups.map((g) => (
            <div key={g.kind} className="flex min-w-[180px] flex-col gap-2">
              <div className="text-[10.5px] font-semibold tracking-[0.07em] text-ink-3 uppercase">
                {kindLabel[g.kind]} · {g.items.length}
              </div>
              <div className="flex flex-col gap-2">
                {g.items.map((a) => (
                  <StageChip
                    key={a.id}
                    a={a}
                    kind={g.kind}
                    cited={citedIds.has(a.id)}
                    grow={false}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Shell>
    );
  }

  const collapsible = chain.lanes.length > VISIBLE_LANES;
  const visible = collapsible && !expanded ? chain.lanes.slice(0, VISIBLE_LANES) : chain.lanes;
  const hidden = chain.lanes.length - visible.length;

  return (
    <Shell>
      {chain.gaps === 0 ? (
        <Banner tone="good" icon={<Check className="size-4" />}>
          Complete trail — every change traces back to a pull request, an issue, and a review.
        </Banner>
      ) : (
        <Banner tone="warn" icon={<Alert className="size-4" />}>
          <b className="font-semibold text-ink">{chain.gaps}</b> {chain.gaps === 1 ? "gap" : "gaps"}{" "}
          in the causal trail — shown dashed below. The line’s recorded reason stops there.
        </Banner>
      )}

      <div className="flex flex-col divide-y divide-line">
        {visible.map((lane, i) => (
          <div key={lane.commit.id} className={i === 0 ? "pb-4" : "py-4 last:pb-0"}>
            <Lane lane={lane} citedIds={citedIds} />
          </div>
        ))}
      </div>

      {collapsible && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-line bg-inset px-2.5 py-1.5 text-[12px] font-medium text-ink-2 transition-colors hover:border-accent/40 hover:text-accent-press"
        >
          {expanded ? "Show fewer paths" : `Show all ${chain.lanes.length} paths`}
          {!expanded && hidden > 0 && <span className="text-ink-3">· {hidden} more</span>}
        </button>
      )}
    </Shell>
  );
}
