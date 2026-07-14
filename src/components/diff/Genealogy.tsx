import { Fragment } from "react";
import type { VerifiedDiffFinding } from "@git-investigator/core/diff/types";
import type { Artifact, ArtifactKind } from "@git-investigator/core/types";
import { buildCausalChain, type ChainLane } from "../chain/use-causal-chain";
import { basename } from "../format";
import { Alert, ChevronRight, FileIcon, KindIcon, kindLabel } from "../icons";

function Chip({ a, kind, cited }: { a: Artifact; kind: ArtifactKind; cited: boolean }) {
  const inner = (
    <>
      <div className="flex items-center gap-1.5">
        <span
          className={`grid size-4.5 shrink-0 place-items-center rounded ${
            cited ? "bg-accent text-white" : "bg-inset text-ink-3"
          }`}
        >
          <KindIcon kind={kind} className="size-2.75" />
        </span>
        <span className="text-[9px] font-semibold tracking-[0.07em] text-ink-3 uppercase">
          {kindLabel[kind]}
        </span>
      </div>
      <div className="mt-1 font-mono text-[10.5px] text-ink-2">{a.ref ?? a.id}</div>
    </>
  );
  const cls = `flex min-w-[76px] shrink-0 flex-col rounded-md border px-2 py-1.5 ${
    cited ? "border-accent/45 bg-surface ring-1 ring-accent-tint" : "border-line bg-surface"
  }`;
  return a.url ? (
    <a
      href={a.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`${cls} transition-colors hover:border-accent/50`}
    >
      {inner}
    </a>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

function Gap({ kind, text }: { kind: ArtifactKind; text: string }) {
  return (
    <div className="flex min-w-19 shrink-0 flex-col justify-center rounded-md border border-dashed border-line-2 bg-surface-2 px-2 py-1.5">
      <div className="flex items-center gap-1.5">
        <span className="grid size-4.5 shrink-0 place-items-center rounded bg-inset text-ink-3 opacity-50">
          <KindIcon kind={kind} className="size-2.75" />
        </span>
        <span className="text-[9px] font-semibold tracking-[0.07em] text-ink-3 uppercase">
          {kindLabel[kind]}
        </span>
      </div>
      <div className="mt-1 text-[10px] text-ink-3 italic">{text}</div>
    </div>
  );
}

function Terminal({ label }: { label: string }) {
  return (
    <div className="flex min-w-19 shrink-0 flex-col rounded-md border border-accent/40 bg-accent-tint/70 px-2 py-1.5">
      <div className="flex items-center gap-1.5">
        <span className="grid size-4.5 shrink-0 place-items-center rounded bg-accent text-white">
          <FileIcon className="size-2.75" />
        </span>
        <span className="text-[9px] font-semibold tracking-[0.07em] text-accent-press uppercase">
          This PR
        </span>
      </div>
      <div className="mt-1 font-mono text-[10.5px] text-accent-press">{label}</div>
    </div>
  );
}

function Arrow() {
  return <ChevronRight className="size-3.5 shrink-0 self-center text-ink-3" />;
}

function laneNodes(lane: ChainLane, cited: Set<string>): React.ReactNode[] {
  if (!lane.pr.artifact) {
    return [
      <div
        key="direct"
        className="flex min-w-47.5 shrink-0 items-center gap-1.5 rounded-md border border-dashed border-line-2 bg-surface-2 px-2.5 py-1.5 text-[11px] text-ink-3"
      >
        <Alert className="size-3.5 shrink-0 opacity-70" />
        Committed directly — no issue, PR, or review in the trail
      </div>,
      <Chip key={lane.commit.id} a={lane.commit} kind="commit" cited={cited.has(lane.commit.id)} />,
    ];
  }
  return [
    lane.issue.artifact ? (
      <Chip
        key="issue"
        a={lane.issue.artifact}
        kind="issue"
        cited={cited.has(lane.issue.artifact.id)}
      />
    ) : (
      <Gap key="issue" kind="issue" text="none linked" />
    ),
    <Chip
      key="pr"
      a={lane.pr.artifact}
      kind="pull_request"
      cited={cited.has(lane.pr.artifact.id)}
    />,
    lane.review.artifact ? (
      <Chip
        key="review"
        a={lane.review.artifact}
        kind="review"
        cited={cited.has(lane.review.artifact.id)}
      />
    ) : (
      <Gap key="review" kind="review" text="none recorded" />
    ),
    <Chip key="commit" a={lane.commit} kind="commit" cited={cited.has(lane.commit.id)} />,
  ];
}

export function Genealogy({ finding }: { finding: VerifiedDiffFinding }) {
  const chain = buildCausalChain(finding.artifacts);
  if (chain.mode === "empty") return null;

  const cited = new Set(finding.citations);
  const target = finding.targets[0];
  const label = target ? `${basename(target.path)}:${target.range.start}` : `#${finding.ref}`;

  const nodes: React.ReactNode[] =
    chain.mode === "lanes"
      ? laneNodes(chain.lanes[0], cited)
      : chain.mode === "commits-only"
        ? chain.commits.map((c) => <Chip key={c.id} a={c} kind="commit" cited={cited.has(c.id)} />)
        : chain.groups.flatMap((g) =>
            g.items.map((a) => <Chip key={a.id} a={a} kind={g.kind} cited={cited.has(a.id)} />),
          );

  const sequence = [...nodes, <Terminal key="__terminal" label={label} />];

  return (
    <div className="mt-4">
      <div className="mb-2 text-[10.5px] font-semibold tracking-[0.06em] text-ink-3 uppercase">
        Reconstructed history
      </div>
      <div className="flex items-stretch gap-1.5 overflow-x-auto pb-1">
        {sequence.map((n, i) => (
          <Fragment key={i}>
            {i > 0 && <Arrow />}
            {n}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
