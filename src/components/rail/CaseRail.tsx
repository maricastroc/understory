import type { DigResult, Evidence } from "@/lib/types";
import { ExternalLink, Lock, Repo, Shield, Users } from "../icons";
import { Avatar } from "../ui";
import { MetaRow, RailCard } from "./RailCard";
import { Provenance } from "./Provenance";

export function CaseRail({ result }: { result: DigResult }) {
  const ev: Evidence = result.evidence;
  const repoName = ev.repo.name ?? ev.repo.path.split("/").filter(Boolean).pop() ?? ev.repo.path;
  const loc = ev.location
    ? `${ev.location.file}:${ev.location.startLine}${
        ev.location.endLine !== ev.location.startLine ? `-${ev.location.endLine}` : ""
      }`
    : (ev.anchor?.ref ?? ev.anchor?.id ?? "—");

  const counts = new Map<string, number>();
  for (const a of ev.artifacts) {
    const n = a.author?.name;
    if (n) counts.set(n, (counts.get(n) ?? 0) + 1);
  }
  const people = [...counts.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <>
      <RailCard icon={<Repo className="size-[15px]" />} title="Repository">
        <div className="flex items-center gap-2 text-[14px] font-semibold tracking-tight">
          {!ev.repo.remoteUrl && <Lock className="size-3.5 shrink-0 text-ink-3" />}
          <span className="truncate font-mono">{repoName}</span>
        </div>
        <div className="mt-3">
          <MetaRow k="Branch" v={ev.repo.branch ?? "—"} mono tail />
          <MetaRow k={ev.location ? "Location" : "Anchor"} v={loc} mono tail />
          <MetaRow
            k="History"
            v={
              <span className="tnum">
                {ev.artifacts.length} commit{ev.artifacts.length !== 1 ? "s" : ""}
              </span>
            }
          />
          <MetaRow k="Contributors" v={<span className="tnum">{people.length}</span>} />
          {ev.repo.remoteUrl && (
            <MetaRow
              k="Remote"
              v={
                <a
                  href={ev.repo.remoteUrl}
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

      {result.narrative && result.narrative.answerable !== false && (
        <RailCard icon={<Shield className="size-[15px]" />} title="Chain of provenance">
          <Provenance narrative={result.narrative} />
        </RailCard>
      )}

      {people.length > 0 && (
        <RailCard icon={<Users className="size-[15px]" />} title="Who's involved">
          <div className="flex flex-col gap-3">
            {people.map(([name, n]) => (
              <div key={name} className="flex items-center gap-2.5">
                <Avatar name={name} size={28} />
                <span className="text-[12.5px] font-semibold text-ink">{name}</span>
                <span className="ml-auto font-mono text-[11px] text-ink-3 tnum">
                  {n} commit{n !== 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        </RailCard>
      )}
    </>
  );
}
