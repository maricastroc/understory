import type { RepoMeta } from "@git-investigator/core/types";
import { fmtCount, fmtDate } from "../format";
import { ExternalLink, Github, Lock, Repo } from "../icons";
import { MetaRow, RailCard } from "./RailCard";

const kindLabel = { github: "GitHub", remote: "Cloned", local: "Local" } as const;

export function RepoRail({ meta }: { meta: RepoMeta }) {
  return (
    <>
      <RailCard icon={<Repo className="size-3.75" />} title="Repository">
        <div className="flex items-center gap-2 text-[14px] font-semibold tracking-tight">
          {meta.kind === "github" ? (
            <Github className="size-4 shrink-0 text-ink-2" />
          ) : (
            meta.private && <Lock className="size-3.5 shrink-0 text-ink-3" />
          )}
          <span className="min-w-0 truncate font-mono">{meta.name}</span>
          <span className="ml-auto shrink-0 rounded-full bg-inset px-2 py-0.5 text-[10.5px] font-semibold text-ink-3">
            {kindLabel[meta.kind]}
          </span>
        </div>
        {meta.description && (
          <p className="mt-2 line-clamp-3 text-[12.5px] leading-relaxed text-ink-2">
            {meta.description}
          </p>
        )}
        <div className="mt-3">
          <MetaRow k="Default branch" v={meta.branch ?? "—"} mono />
          {meta.language && <MetaRow k="Language" v={meta.language} />}
          {meta.stars != null && (
            <MetaRow k="Stars" v={<span className="tnum">{fmtCount(meta.stars)}</span>} />
          )}
          {meta.forks != null && (
            <MetaRow k="Forks" v={<span className="tnum">{fmtCount(meta.forks)}</span>} />
          )}
          {meta.openIssues != null && (
            <MetaRow k="Open issues" v={<span className="tnum">{fmtCount(meta.openIssues)}</span>} />
          )}
          {meta.pushedAt && <MetaRow k="Last push" v={fmtDate(meta.pushedAt)} />}
          {meta.htmlUrl && (
            <MetaRow
              k="Remote"
              v={
                <a
                  href={meta.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-accent-press hover:underline"
                >
                  open <ExternalLink className="size-3" />
                </a>
              }
            />
          )}
        </div>
      </RailCard>

      <div className="rounded-[10px] border border-dashed border-line-2 bg-surface px-4 py-3 text-[12px] leading-relaxed text-ink-3">
        Pick a file and click a line — the provenance chain and the people behind it appear here.
      </div>
    </>
  );
}
