import type { Artifact, ArtifactKind, EntailmentStatus } from "@understory/core/types";
import { Alert, Check, ExternalLink, KindIcon } from "../icons";

const sourceNoun = (kind: ArtifactKind): string =>
  kind === "pull_request"
    ? "PR"
    : kind === "commit"
      ? "Commit"
      : kind === "issue"
        ? "Issue"
        : "Review";

function SupportMark({ status }: { status?: EntailmentStatus }) {
  if (status === "unsupported") return <Alert className="size-3.5 shrink-0 text-crit" />;
  if (status === "weak") return <Check className="size-3.5 shrink-0 text-ink-3" />;
  return <Check className="size-3.5 shrink-0 text-good" />;
}

export function SourcesUsed({
  resolved,
  byId,
  statusById,
  label = "Sources used",
}: {
  resolved: string[];
  byId: Map<string, Artifact>;
  statusById?: Map<string, EntailmentStatus>;
  label?: string;
}) {
  if (resolved.length === 0) return null;
  return (
    <div className="mt-6">
      <div className="mb-2.5 text-[11px] font-semibold tracking-[0.06em] text-ink-3 uppercase">
        {label}
      </div>
      <div className="flex flex-wrap gap-2">
        {resolved.map((id) => {
          const a = byId.get(id);
          if (!a) return null;
          const label = `${sourceNoun(a.kind)} ${a.ref ?? id}`;
          const inner = (
            <>
              <SupportMark status={statusById?.get(id)} />
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
              className="inline-flex items-center gap-1.5 rounded-md border border-line-2 bg-surface px-2.5 py-1.5 text-[12.5px] shadow-card transition-colors hover:border-accent/50 hover:bg-accent-tint/60"
            >
              {inner}
            </a>
          ) : (
            <span
              key={id}
              className="inline-flex items-center gap-1.5 rounded-md border border-line-2 bg-surface px-2.5 py-1.5 text-[12.5px] shadow-card"
            >
              {inner}
            </span>
          );
        })}
      </div>
    </div>
  );
}
