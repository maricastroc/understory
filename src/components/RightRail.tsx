import type { DigResult, Evidence, RepoMeta, VerifiedNarrative } from "@/lib/types";
import { fmtCount, fmtDate } from "./format";
import { ExternalLink, Lock, Repo, Shield, Users } from "./icons";
import { Avatar } from "./ui";

function Card({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[10px] border border-line bg-surface shadow-card">
      <div className="flex items-center gap-2 px-4 pt-3.5 pb-1 text-ink-3">
        {icon}
        <span className="text-[12px] font-semibold text-ink-2">{title}</span>
      </div>
      <div className="px-4 pt-1 pb-4">{children}</div>
    </div>
  );
}

function MetaRow({
  k,
  v,
  mono,
  tail,
}: {
  k: string;
  v: React.ReactNode;
  mono?: boolean;
  tail?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line/50 py-[7px] text-[12.5px] first:border-t-0">
      <span className="shrink-0 text-ink-2">{k}</span>
      <span
        dir={tail ? "rtl" : undefined}
        title={typeof v === "string" ? v : undefined}
        className={`min-w-0 truncate text-right font-medium text-ink ${mono ? "font-mono text-[12px]" : ""}`}
      >
        {tail ? <bdi>{v}</bdi> : v}
      </span>
    </div>
  );
}

function Provenance({ narrative }: { narrative: VerifiedNarrative }) {
  const c = narrative.confidence;
  const denom = Math.max(1, c.primarySources + c.corroborating + c.contradicting);
  const pct = (n: number) => `${Math.max(n > 0 ? 6 : 2, Math.round((n / denom) * 100))}%`;
  const bars: Array<{ label: string; n: number; color: string }> = [
    { label: "Primary sources", n: c.primarySources, color: "var(--color-good)" },
    { label: "Corroborating", n: c.corroborating, color: "var(--color-accent)" },
    { label: "Contradicting", n: c.contradicting, color: "var(--color-crit)" },
  ];

  return (
    <>
      <div
        className={`text-[15px] font-semibold ${narrative.grounded ? "text-good" : "text-crit"}`}
      >
        {narrative.grounded
          ? "All citations grounded"
          : `${narrative.unknownCitations.length} fabricated citation${narrative.unknownCitations.length > 1 ? "s" : ""}`}
      </div>
      <div className="mt-1 text-[12px] leading-snug text-ink-2">
        {narrative.grounded
          ? "Every cited source resolves to a real, collected artifact. 0 unverified citations."
          : "A cited source was not found in the collected evidence — verification caught it."}
      </div>
      <div className="mt-3 flex flex-col gap-2.5">
        {bars.map((b) => (
          <div key={b.label} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[12.5px]">
              <span className="flex items-center gap-2 text-ink-2">
                <span className="size-2 rounded-[2px]" style={{ background: b.color }} />
                {b.label}
              </span>
              <span className="font-semibold tnum">{b.n}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-inset">
              <span
                className="block h-full rounded-full"
                style={{ width: pct(b.n), background: b.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function RightRail({
  result,
  repoMeta,
}: {
  result: DigResult | null;
  repoMeta?: RepoMeta | null;
}) {
  return (
    <aside className="hidden w-[284px] shrink-0 overflow-y-auto border-l border-line-2 bg-surface-2 xl:block">
      <div className="flex flex-col gap-3.5 p-[18px] pb-10">
        {result ? (
          <RailContent result={result} />
        ) : repoMeta ? (
          <RepoRail meta={repoMeta} />
        ) : (
          <RailPlaceholder />
        )}
      </div>
    </aside>
  );
}

function RailPlaceholder() {
  return (
    <div className="rounded-[10px] border border-dashed border-line-2 bg-surface p-5 text-[12.5px] leading-relaxed text-ink-3">
      Repository metadata, chain of provenance, and the people behind the change appear here once an
      investigation runs.
    </div>
  );
}

function RepoRail({ meta }: { meta: RepoMeta }) {
  return (
    <>
      <Card icon={<Repo className="size-[15px]" />} title="Repository">
        <div className="flex items-center gap-2 text-[14px] font-semibold tracking-tight">
          {meta.private ? (
            <Lock className="size-3.5 text-ink-3" />
          ) : (
            <Repo className="size-3.5 text-ink-3" />
          )}
          <span className="truncate font-mono">{meta.name}</span>
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
            <MetaRow
              k="Open issues"
              v={<span className="tnum">{fmtCount(meta.openIssues)}</span>}
            />
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
      </Card>

      <div className="rounded-[10px] border border-dashed border-line-2 bg-surface px-4 py-3 text-[12px] leading-relaxed text-ink-3">
        Pick a file and click a line — the chain of provenance and the people behind it appear here.
      </div>
    </>
  );
}

function RailContent({ result }: { result: DigResult }) {
  const ev: Evidence = result.evidence;
  const repoName = ev.repo.name ?? ev.repo.path.split("/").filter(Boolean).pop() ?? ev.repo.path;
  const loc = `${ev.location.file}:${ev.location.startLine}${
    ev.location.endLine !== ev.location.startLine ? `-${ev.location.endLine}` : ""
  }`;

  const counts = new Map<string, number>();
  for (const a of ev.artifacts) {
    const n = a.author?.name;
    if (n) counts.set(n, (counts.get(n) ?? 0) + 1);
  }
  const people = [...counts.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <>
      <Card icon={<Repo className="size-[15px]" />} title="Repository">
        <div className="flex items-center gap-2 text-[14px] font-semibold tracking-tight">
          {ev.repo.remoteUrl ? (
            <Repo className="size-3.5 text-ink-3" />
          ) : (
            <Lock className="size-3.5 text-ink-3" />
          )}
          <span className="truncate font-mono">{repoName}</span>
        </div>
        <div className="mt-3">
          <MetaRow k="Branch" v={ev.repo.branch ?? "—"} mono tail />
          <MetaRow k="Location" v={loc} mono tail />
          <MetaRow
            k="Commits on this line"
            v={<span className="tnum">{ev.artifacts.length}</span>}
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
      </Card>

      {result.narrative && (
        <Card icon={<Shield className="size-[15px]" />} title="Chain of provenance">
          <Provenance narrative={result.narrative} />
        </Card>
      )}

      {people.length > 0 && (
        <Card icon={<Users className="size-[15px]" />} title="Who's involved">
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
        </Card>
      )}
    </>
  );
}
