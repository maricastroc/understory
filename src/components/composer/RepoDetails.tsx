import type { RepoMeta, TreeOverview } from "@git-investigator/core/types";
import type { ReactNode } from "react";
import { fmtDate } from "../format";
import { DomainIcon } from "../line-investigation/parts/DomainIcon";
import { repoDisplayName } from "../shell/repo-display-name";
import type { HistoryMapControl } from "./history/use-history-map";

const CELL: Record<string, string> = {
  mapped: "border-li-ink bg-li-ink",
  mapping: "border-li-steel bg-li-steel-100",
  unavailable: "border-li-neutral-500",
  "too-large": "border-li-neutral-500",
  stub: "border-dashed border-li-neutral-500",
};

function Segment({
  label,
  children,
  sub,
  grow = false,
}: {
  label: string;
  children: ReactNode;
  sub?: ReactNode;
  grow?: boolean;
}) {
  return (
    <div
      className={`flex min-w-0 flex-col gap-1 border-l border-li-divider px-4 py-3 first:border-l-0 first:pl-0 max-[1100px]:border-l-0 max-[1100px]:pl-0 ${
        grow ? "max-w-100 shrink" : "shrink-0"
      }`}
    >
      <dt className="font-li-mono text-[10.5px] tracking-[0.08em] text-li-text-subtle uppercase">
        {label}
      </dt>
      <dd className="flex min-w-0 items-center gap-2 text-[15px] leading-tight font-medium text-li-ink">
        {children}
      </dd>
      {sub && <dd className="text-[11.5px] text-li-text-subtle">{sub}</dd>}
    </div>
  );
}

export function RepoDetails({
  repoPath,
  meta,
  overview,
  map,
}: {
  repoPath: string;
  meta: RepoMeta | null;
  overview: TreeOverview | null;
  map: HistoryMapControl;
}) {
  const name = repoDisplayName(meta?.name ?? repoPath);
  const head = overview?.head ?? null;
  const shown = overview?.files ?? [];
  const status = (path: string) => map.states.get(path)?.status ?? "stub";

  return (
    <div className="border-t border-li-divider">
      <dl className="flex items-stretch max-[1100px]:grid max-[1100px]:grid-cols-3 max-[1100px]:gap-x-6 max-[640px]:grid-cols-2">
        <Segment
          grow
          label="repository"
          sub={meta?.kind === "github" ? "GitHub" : meta?.kind === "remote" ? "cloned" : "local"}
        >
          <DomainIcon kind="repository" />
          {meta?.htmlUrl ? (
            <a
              href={meta.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-li-steel"
            >
              {name}{" "}
              <span aria-hidden className="text-li-text-subtle">
                ↗
              </span>
            </a>
          ) : (
            <span className="truncate">{name}</span>
          )}
        </Segment>
        {meta?.branch && (
          <Segment label="branch">
            <span className="font-li-mono text-[14px]">{meta.branch}</span>
          </Segment>
        )}
        {head && (
          <Segment label="head" sub={overview?.shallow ? "shallow clone" : fmtDate(head.date)}>
            <DomainIcon kind="commit" />
            <span className="font-li-mono text-[14px]">{head.sha.slice(0, 7)}</span>
          </Segment>
        )}
        {overview && (
          <Segment
            label="files"
            sub={overview.truncated ? "partial file list" : "in the tree at HEAD"}
          >
            <span className="font-li-mono text-[14px]">
              {overview.truncated ? "≥" : ""}
              {overview.total.toLocaleString("en-US")}
            </span>
          </Segment>
        )}
        {overview && shown.length > 0 && (
          <Segment
            label="mapped"
            sub={
              map.mapping
                ? `mapping ${map.mapping}`
                : overview.mappable
                  ? "files shown below"
                  : "not available here"
            }
          >
            <span className="font-li-mono text-[14px]">
              {map.mapped}
              <span className="text-li-text-subtle"> / {shown.length}</span>
            </span>
            <span aria-hidden className="flex gap-0.5">
              {shown.map((f) => (
                <span key={f.path} className={`h-3.5 w-1 border ${CELL[status(f.path)]}`} />
              ))}
            </span>
          </Segment>
        )}
        {overview && (
          <Segment
            label="pr data"
            sub={
              overview.prData === "github" ? "looked up per commit" : "no GitHub remote or token"
            }
          >
            <DomainIcon kind="pull_request" />
            <span>{overview.prData === "github" ? "GitHub" : "unavailable"}</span>
          </Segment>
        )}
      </dl>
    </div>
  );
}
