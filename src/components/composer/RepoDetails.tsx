import type { RepoMeta, TreeOverview } from "@understory/core/types";
import type { ReactNode } from "react";
import { fmtDate } from "../format";
import { DomainIcon } from "../line-investigation/parts/DomainIcon";
import type { HistoryMapControl } from "./history/use-history-map";

const SOURCE: Record<RepoMeta["kind"], string> = {
  github: "GitHub",
  remote: "Cloned from URL",
  local: "Local clone",
};

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
}: {
  label: string;
  children: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 border-l border-li-divider px-5 py-3.5 first:border-l-0 first:pl-0 max-[1100px]:border-l-0 max-[1100px]:pl-0">
      <dt className="li-eyebrow text-li-text-subtle">{label}</dt>
      <dd className="flex min-w-0 items-center gap-2 font-li-mono text-[13.5px] leading-tight text-li-ink tnum">
        {children}
      </dd>
      {sub && <dd className="truncate text-[12px] text-li-text-subtle">{sub}</dd>}
    </div>
  );
}

export function RepoDetails({
  meta,
  overview,
  map,
}: {
  meta: RepoMeta | null;
  overview: TreeOverview | null;
  map: HistoryMapControl;
}) {
  const head = overview?.head ?? null;
  const shown = overview?.files ?? [];
  const status = (path: string) => map.states.get(path)?.status ?? "stub";

  return (
    <div className="border-t border-li-divider">
      <dl className="grid grid-cols-[repeat(6,minmax(0,max-content))] items-stretch max-[1100px]:grid-cols-3 max-[1100px]:gap-x-6 max-[640px]:grid-cols-2">
        <Segment
          label="source"
          sub={meta?.private ? "private" : meta?.kind === "local" ? "on this machine" : undefined}
        >
          {meta?.htmlUrl ? (
            <a
              href={meta.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="li-link truncate font-li-body text-[14px]"
            >
              {SOURCE[meta.kind]}
              <span aria-hidden> ↗</span>
            </a>
          ) : (
            <span className="font-li-body text-[14px]">{SOURCE[meta?.kind ?? "local"]}</span>
          )}
        </Segment>
        {meta?.branch && (
          <Segment label="branch">
            <span className="truncate">{meta.branch}</span>
          </Segment>
        )}
        {head && (
          <Segment label="head" sub={overview?.shallow ? "shallow clone" : fmtDate(head.date)}>
            <DomainIcon kind="commit" size={14} />
            {head.sha.slice(0, 7)}
          </Segment>
        )}
        {overview && (
          <Segment
            label="files"
            sub={overview.truncated ? "partial file list" : "in the tree at HEAD"}
          >
            {overview.truncated ? "≥" : ""}
            {overview.total.toLocaleString("en-US")}
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
            <span>
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
            <DomainIcon kind="pull_request" size={14} muted={overview.prData !== "github"} />
            <span className={overview.prData === "github" ? "" : "text-li-text-subtle"}>
              {overview.prData === "github" ? "GitHub" : "unavailable"}
            </span>
          </Segment>
        )}
      </dl>
    </div>
  );
}
