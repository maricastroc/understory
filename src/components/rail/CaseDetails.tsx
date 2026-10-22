import type { DigResult, Evidence } from "@understory/core/types";
import { useMessages } from "@/i18n/LocaleProvider";
import { ExternalLink, Github, Repo, Shield, Users } from "../icons";
import { Avatar } from "../ui";
import { MetaRow, RailCard } from "./RailCard";
import { Provenance } from "./Provenance";

export function CaseDetails({ result }: { result: DigResult }) {
  const r = useMessages().report.rail;
  const ev: Evidence = result.evidence;
  const repoName = ev.repo.name ?? ev.repo.path.split("/").filter(Boolean).pop() ?? ev.repo.path;
  const anchor = ev.anchor?.ref ?? ev.anchor?.id ?? "—";

  const counts = new Map<string, number>();
  for (const a of ev.artifacts) {
    const n = a.author?.name;
    if (n) counts.set(n, (counts.get(n) ?? 0) + 1);
  }
  const people = [...counts.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <>
      <RailCard icon={<Repo className="size-3.75" />} title={r.repository}>
        <div className="flex items-center gap-2 text-[14px] font-semibold tracking-tight">
          {ev.repo.remoteUrl?.includes("github.com") ? (
            <Github className="size-4 shrink-0 text-ink-2" />
          ) : (
            <Repo className="size-3.5 shrink-0 text-ink-3" />
          )}
          <span className="truncate font-mono">{repoName}</span>
        </div>
        <div className="mt-3">
          <MetaRow k={r.branch} v={ev.repo.branch ?? "—"} mono tail />
          <MetaRow k={r.anchor} v={anchor} mono tail />
          <MetaRow
            k={r.history}
            v={<span className="tnum">{r.commits(ev.artifacts.length)}</span>}
          />
          <MetaRow k={r.contributors} v={<span className="tnum">{people.length}</span>} />
          {ev.repo.remoteUrl && (
            <MetaRow
              k={r.remote}
              v={
                <a
                  href={ev.repo.remoteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-accent-press hover:underline"
                >
                  {r.open} <ExternalLink className="size-3" />
                </a>
              }
            />
          )}
        </div>
      </RailCard>

      {result.narrative && result.narrative.answerable !== false && (
        <RailCard icon={<Shield className="size-3.75" />} title={r.chain}>
          <Provenance narrative={result.narrative} />
        </RailCard>
      )}

      {people.length > 0 && (
        <RailCard icon={<Users className="size-3.75" />} title={r.people}>
          <div className="flex flex-col gap-3">
            {people.map(([name, n]) => (
              <div key={name} className="flex items-center gap-2.5">
                <Avatar name={name} size={28} />
                <span className="text-[12.5px] font-semibold text-ink">{name}</span>
                <span className="ml-auto font-mono text-[11px] text-ink-3 tnum">
                  {r.commits(n)}
                </span>
              </div>
            ))}
          </div>
        </RailCard>
      )}
    </>
  );
}
