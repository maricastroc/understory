import type { RepoMeta, TreeOverview } from "@git-investigator/core/types";
import { fmtDate } from "../format";

const plural = (n: number, one: string) =>
  `${n.toLocaleString("en-US")} ${one}${n === 1 ? "" : "s"}`;

export function RepoMetaRow({ meta, overview }: { meta: RepoMeta; overview: TreeOverview | null }) {
  return (
    <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 font-li-mono text-[11.5px] text-li-neutral-700">
      <span className="font-medium text-li-ink">{meta.name}</span>
      {meta.kind !== "github" && meta.branch && <span>{meta.branch}</span>}
      {meta.language && <span>{meta.language}</span>}
      {meta.stars != null && <span>★ {meta.stars.toLocaleString("en-US")}</span>}
      {meta.forks != null && <span>{plural(meta.forks, "fork")}</span>}
      {meta.openIssues != null && (
        <span>{meta.openIssues.toLocaleString("en-US")} open issues</span>
      )}
      {meta.pushedAt && <span>pushed {fmtDate(meta.pushedAt)}</span>}
      {overview?.truncated && <span className="text-li-ink">partial file list</span>}
      {overview?.shallow && <span className="text-li-ink">shallow clone</span>}
      {meta.htmlUrl && (
        <a
          href={meta.htmlUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-li-body text-xs text-li-steel-700 hover:text-li-steel-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-li-steel"
        >
          {meta.kind === "github" ? "GitHub ↗" : "Open ↗"}
        </a>
      )}
    </p>
  );
}
