import type { Artifact, ArtifactKind, Provenance } from "@git-investigator/core/types";
import { Branch, ExternalLink, KindIcon } from "../icons";

const noun = (kind: ArtifactKind): string =>
  kind === "pull_request" ? "PR" : kind === "commit" ? "Commit" : kind === "issue" ? "Issue" : "Review";

export function OriginTrace({
  provenance,
  byId,
}: {
  provenance: Provenance;
  byId: Map<string, Artifact>;
}) {
  const items = [provenance.pr, provenance.commit]
    .filter((id): id is string => Boolean(id))
    .map((id) => byId.get(id))
    .filter((a): a is Artifact => Boolean(a));
  if (items.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="mb-2.5 text-[11px] font-semibold tracking-[0.06em] text-ink-3 uppercase">
        Provenance
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-2">
          <Branch className="size-3.5 text-ink-3" />
          This line traces to
        </span>
        {items.map((a) => {
          const label = `${noun(a.kind)} ${a.ref ?? a.id}`;
          const inner = (
            <>
              <KindIcon kind={a.kind} className="size-3.5 shrink-0 text-ink-3" />
              <span className="font-semibold text-ink">{label}</span>
              {a.url && <ExternalLink className="size-3 shrink-0 text-ink-3" />}
            </>
          );
          return a.url ? (
            <a
              key={a.id}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-line bg-inset px-2.5 py-1.5 text-[12.5px] transition-colors hover:border-accent/40 hover:bg-accent-tint"
            >
              {inner}
            </a>
          ) : (
            <span
              key={a.id}
              className="inline-flex items-center gap-1.5 rounded-md border border-line bg-inset px-2.5 py-1.5 text-[12.5px]"
            >
              {inner}
            </span>
          );
        })}
      </div>
    </div>
  );
}
