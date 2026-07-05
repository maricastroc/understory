import type { Artifact, ArtifactKind } from "@/lib/types";
import { Check, ExternalLink, KindIcon } from "../icons";

const sourceNoun = (kind: ArtifactKind): string =>
  kind === "pull_request"
    ? "PR"
    : kind === "commit"
      ? "Commit"
      : kind === "issue"
        ? "Issue"
        : "Review";

export function SourcesUsed({
  resolved,
  byId,
}: {
  resolved: string[];
  byId: Map<string, Artifact>;
}) {
  if (resolved.length === 0) return null;
  return (
    <div className="mt-6">
      <div className="mb-2.5 text-[11px] font-semibold tracking-[0.06em] text-ink-3 uppercase">
        Sources used
      </div>
      <div className="flex flex-wrap gap-2">
        {resolved.map((id) => {
          const a = byId.get(id);
          if (!a) return null;
          const label = `${sourceNoun(a.kind)} ${a.ref ?? id}`;
          const inner = (
            <>
              <Check className="size-3.5 shrink-0 text-good" />
              <KindIcon kind={a.kind} className="size-3.5 shrink-0 text-ink-3" />
              <span className="font-semibold text-ink">{label}</span>
              {a.url && <ExternalLink className="size-3 shrink-0 text-ink-3" />}
            </>
          );
          return a.url ? (
            <a
              key={id}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-line bg-inset px-2.5 py-1.5 text-[12.5px] transition-colors hover:border-accent/40 hover:bg-accent-tint"
            >
              {inner}
            </a>
          ) : (
            <span
              key={id}
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
