import type { VerifiedDiffFinding } from "@git-investigator/core/diff/types";
import type { ArtifactKind } from "@git-investigator/core/types";
import { levelLabel } from "../format";
import { Alert, Check, kindLabel } from "../icons";

const ORDER: ArtifactKind[] = ["commit", "pull_request", "issue", "review"];

function countKind(finding: VerifiedDiffFinding, kind: ArtifactKind): number {
  return finding.artifacts.filter((a) => a.kind === kind).length;
}

function foundLabel(kind: ArtifactKind, n: number): string {
  if (n > 1) return `${n} ${kindLabel[kind].toLowerCase()}s`;
  return `${kindLabel[kind]} found`;
}

function Tick({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 ${ok ? "text-ink-2" : "text-crit"}`}>
      {ok ? <Check className="size-3 text-good" /> : <Alert className="size-3" />}
      {children}
    </span>
  );
}

// The audit trail behind a finding's confidence: what the dig turned up, whether every
// citation resolved, and whether the judge could substantiate them in-source. Makes the
// "High · 90%" pill traceable instead of asserted.
export function ConfidenceLedger({ finding }: { finding: VerifiedDiffFinding }) {
  if (!finding.recorded) return null;

  const found = ORDER.map((kind) => ({ kind, n: countKind(finding, kind) })).filter((x) => x.n > 0);
  const e = finding.entailment;

  return (
    <div className="mt-4 rounded-md border border-line bg-inset/40 px-3 py-2.5">
      <div className="mb-2 text-[10.5px] font-semibold tracking-[0.06em] text-ink-3 uppercase">
        Why {levelLabel[finding.confidence.level].toLowerCase()} confidence
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11.5px]">
        {found.map(({ kind, n }) => (
          <Tick key={kind} ok>
            {foundLabel(kind, n)}
          </Tick>
        ))}
        <Tick ok={finding.grounded}>
          {finding.grounded ? "grounding confirmed" : "fabrication caught"}
        </Tick>
        {e?.checked &&
          (e.misattributed > 0 ? (
            <Tick ok={false}>{e.misattributed} not substantiated</Tick>
          ) : e.supported > 0 ? (
            <Tick ok>{e.supported} substantiated in-source</Tick>
          ) : null)}
      </div>
    </div>
  );
}
