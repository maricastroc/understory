import type { BlameTarget, VerifiedDiffFinding } from "@git-investigator/core/diff/types";
import type { Artifact, ArtifactKind } from "@git-investigator/core/types";
import { levelLabel } from "../format";
import { Alert, Check, ExternalLink, KindIcon } from "../icons";
import { Pill } from "../ui";

const sourceNoun = (k: ArtifactKind): string =>
  k === "pull_request" ? "PR" : k === "commit" ? "Commit" : k === "issue" ? "Issue" : "Review";

const loc = (t: BlameTarget): string =>
  `${t.path}:${t.range.start}${t.range.end !== t.range.start ? `-${t.range.end}` : ""}`;

function status(f: VerifiedDiffFinding): {
  tone: "good" | "warn" | "crit" | "neutral";
  label: string;
} {
  if (!f.grounded) return { tone: "crit", label: "Ungrounded" };
  if (!f.recorded) return { tone: "neutral", label: "History silent" };
  const pct = Math.round(f.confidence.score * 100);
  const tone =
    f.confidence.level === "high" ? "good" : f.confidence.level === "medium" ? "warn" : "neutral";
  return { tone, label: `${levelLabel[f.confidence.level]} · ${pct}%` };
}

function Sources({ finding }: { finding: VerifiedDiffFinding }) {
  const byId = new Map(finding.artifacts.map((a) => [a.id, a] as const));
  const cited = finding.citations.map((id) => byId.get(id)).filter((a): a is Artifact => !!a);
  if (cited.length === 0) return null;
  return (
    <div className="mt-4">
      <div className="mb-2 text-[10.5px] font-semibold tracking-[0.06em] text-ink-3 uppercase">
        Grounded in
      </div>
      <div className="flex flex-wrap gap-2">
        {cited.map((a) => {
          const label = `${sourceNoun(a.kind)} ${a.ref ?? a.id}`;
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

const MAX_TARGETS = 4;

export function FindingCard({ finding, index }: { finding: VerifiedDiffFinding; index: number }) {
  const s = status(finding);
  const cited = new Set(finding.citations);
  const contradictions = finding.contradictions.filter((c) => cited.has(c.artifactId));
  const shownTargets = finding.targets.slice(0, MAX_TARGETS);
  const extraTargets = finding.targets.length - shownTargets.length;

  return (
    <div className="overflow-hidden rounded-[10px] border border-line bg-surface shadow-card">
      <div className="flex flex-wrap items-center gap-2.5 border-b border-line bg-surface-2 px-4 py-3">
        <span className="rounded-md border border-line bg-inset px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-ink-2">
          {index + 1}
        </span>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {shownTargets.map((t) => (
            <span key={loc(t)} className="font-mono text-[12.5px] text-ink">
              {loc(t)}
            </span>
          ))}
          {extraTargets > 0 && (
            <span className="text-[12px] text-ink-3" title={finding.targets.map(loc).join("\n")}>
              +{extraTargets} more location{extraTargets === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <Pill tone={s.tone} dot={s.tone !== "neutral"}>
          {s.label}
        </Pill>
      </div>

      <div className="p-4">
        {finding.recorded ? (
          <p className="max-w-[70ch] text-[14.5px] leading-relaxed whitespace-pre-wrap text-[#2a2d36]">
            {finding.why}
          </p>
        ) : (
          <p className="flex items-start gap-2 text-[13.5px] text-ink-2">
            <Alert className="mt-0.5 size-4 shrink-0 text-ink-3" />
            <span>
              The recorded history doesn&apos;t explain why this code exists — the trail is silent
              here.
            </span>
          </p>
        )}

        {finding.unknownCitations.length > 0 && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-crit/25 bg-crit-tint px-3 py-2 text-[12.5px] text-crit">
            <Alert className="mt-0.5 size-4 shrink-0" />
            <span>
              Fabricated citation caught:{" "}
              <span className="font-mono">{finding.unknownCitations.join(", ")}</span> — not in the
              collected evidence.
            </span>
          </div>
        )}

        {contradictions.length > 0 && (
          <div className="mt-4 flex flex-col gap-1.5 rounded-md border border-crit/25 bg-crit-tint px-3 py-2.5 text-[12.5px] text-crit">
            <div className="flex items-center gap-2 font-semibold">
              <Alert className="size-4 shrink-0" />
              You&apos;re changing code that was later contradicted
            </div>
            {contradictions.map((c) => (
              <span key={`${c.artifactId}:${c.kind}`} className="opacity-90">
                {c.detail}
                {c.by ? ` — ${c.by}` : ""}
              </span>
            ))}
          </div>
        )}

        <Sources finding={finding} />
      </div>
    </div>
  );
}
