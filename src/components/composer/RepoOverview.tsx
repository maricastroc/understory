import type { RepoMeta } from "@/lib/types";
import { fmtCount, fmtDate } from "../format";
import { Branch, Clock, ExternalLink, Fork, Issue, Lock, Repo, Search, Star } from "../icons";

function Stat({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-ink-3">{icon}</span>
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
    <div className="rounded-[10px] border border-line bg-surface-2 p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-accent-tint text-accent-press">
          {meta.private ? <Lock className="size-4" /> : <Repo className="size-4" />}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-mono text-[15px] font-semibold text-ink">
              {meta.name}
            </span>
            <span className="rounded-full bg-inset px-2 py-0.5 text-[11px] font-semibold text-ink-3">
              {kindLabel[meta.kind]}
            </span>
            {meta.private && (
              <span className="text-[11px] font-medium tracking-wide text-ink-3 uppercase">
                Private
              </span>
            )}
          </div>

          {meta.description && (
            <p className="mt-1.5 max-w-[68ch] text-[13px] leading-relaxed text-ink-2">
              {meta.description}
            </p>
          )}
        </div>

        {meta.htmlUrl && (
          <a
            href={meta.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 text-[12.5px] font-medium text-ink-2 hover:text-accent-press"
          >
            Open <ExternalLink className="size-3.5" />
          </a>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-ink-2">
        <Stat icon={<Branch className="size-3.5" />}>
          <b className="font-medium text-ink">{meta.branch ?? "—"}</b>
        </Stat>
        {meta.language && (
          <Stat icon={<span className="size-2 rounded-full bg-accent" />}>{meta.language}</Stat>
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
        <div className="mt-3 flex flex-wrap gap-1.5">
          {topics.slice(0, 8).map((t) => (
            <span
              key={t}
              className="rounded-full bg-inset px-2 py-0.5 font-mono text-[11px] text-ink-2"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center gap-1.5 border-t border-line pt-3 text-[12.5px] text-ink-3">
        <Search className="size-3.5" />
        {isGitHub
          ? "Find a file above and click a line to trace its history."
          : "Local repository — open a line above to reconstruct its history."}
      </div>
    </div>
  );
}
