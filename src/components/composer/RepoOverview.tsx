import type { RepoMeta } from "@git-investigator/core/types";
import { fmtCount, fmtDate } from "../format";
import { Branch, Clock, ExternalLink, Fork, Issue, Lock, Repo, Search, Star } from "../icons";
import { liButton } from "../line-investigation/parts/button-class";
import { CHIP, PANEL } from "./composer-classes";

function Stat({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-li-text-muted">{icon}</span>
      {children}
    </span>
  );
}

const kindLabel: Record<RepoMeta["kind"], string> = {
  github: "GitHub",
  remote: "Cloned",
  local: "Local",
};

export function RepoOverview({ meta }: { meta: RepoMeta }) {
  const isGitHub = meta.kind === "github";
  const topics = meta.topics ?? [];

  return (
    <div className={`p-4 font-li-body text-li-ink ${PANEL}`}>
      <div className="flex items-start gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center bg-li-steel-100 text-li-steel-700">
          {meta.private ? <Lock className="size-4" /> : <Repo className="size-4" />}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-li-mono text-[15px] font-semibold text-li-ink">
              {meta.name}
            </span>
            <span className={CHIP}>{kindLabel[meta.kind]}</span>
          </div>

          {meta.description && (
            <p className="mt-1 max-w-[68ch] text-[13px] leading-relaxed text-li-text-subtle">
              {meta.description}
            </p>
          )}
        </div>

        {meta.htmlUrl && (
          <a
            href={meta.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={liButton("ghost", "text-[12.5px]")}
          >
            Open <ExternalLink className="size-3.5" />
          </a>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-li-text-subtle">
        <Stat icon={<Branch className="size-3.5" />}>
          <span className="font-li-mono font-medium text-li-ink">{meta.branch ?? "—"}</span>
        </Stat>
        {meta.language && (
          <Stat icon={<span className="block size-2 rounded-full bg-li-neutral-500" />}>
            {meta.language}
          </Stat>
        )}
        {meta.stars != null && (
          <Stat icon={<Star className="size-3.5" />}>
            <span className="tnum">{fmtCount(meta.stars)}</span>
          </Stat>
        )}
        {meta.forks != null && (
          <Stat icon={<Fork className="size-3.5" />}>
            <span className="tnum">{fmtCount(meta.forks)}</span>
          </Stat>
        )}
        {meta.openIssues != null && (
          <Stat icon={<Issue className="size-3.5" />}>
            <span className="tnum">{fmtCount(meta.openIssues)}</span> open
          </Stat>
        )}
        {meta.pushedAt && (
          <Stat icon={<Clock className="size-3.5" />}>updated {fmtDate(meta.pushedAt)}</Stat>
        )}
      </div>

      {topics.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {topics.slice(0, 8).map((t) => (
            <span key={t} className={CHIP}>
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3.5 flex items-center gap-1.5 border-t border-li-divider pt-3 text-xs text-li-text-subtle">
        <Search className="size-3.5 shrink-0" />
        {isGitHub
          ? "Find a file above and click a line to trace its history."
          : "Local repository — open a line above to reconstruct its history."}
      </div>
    </div>
  );
}
