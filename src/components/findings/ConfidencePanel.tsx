import { useMessages } from "@/i18n/LocaleProvider";
import type { Confidence, Entailment } from "@understory/core/types";
import { ConfidenceRing } from "../ConfidenceRing";
import { Alert, Check } from "../icons";

function EntailmentLine({ entailment }: { entailment: Entailment }) {
  const f = useMessages().report.findings;
  const tone =
    entailment.misattributed > 0
      ? "text-crit"
      : entailment.supported > 0
        ? "text-good"
        : "text-ink-3";
  const label =
    entailment.misattributed > 0
      ? f.notSubstantiated(entailment.misattributed)
      : entailment.supported > 0
        ? f.substantiated(entailment.supported)
        : f.checkedInSource;

  return (
    <div className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${tone}`}>
      {entailment.misattributed > 0 ? (
        <Alert className="size-3.5" />
      ) : (
        <Check className="size-3.5" />
      )}
      {label}
    </div>
  );
}

export function ConfidencePanel({
  confidence,
  grounded,
  entailment,
  auditUnavailable = false,
}: {
  confidence: Confidence;
  grounded: boolean;
  entailment?: Entailment;
  auditUnavailable?: boolean;
}) {
  const r = useMessages().report;
  return (
    <div className="flex flex-col items-center gap-3 p-6 text-center">
      <ConfidenceRing confidence={confidence} size={88} />
      <div className="flex flex-col items-center gap-1">
        <div className="text-[15px] font-semibold tracking-tight text-ink">
          {r.confidence(r.level[confidence.level])}
        </div>
        <div
          className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${
            grounded ? "text-good" : "text-crit"
          }`}
        >
          {grounded ? <Check className="size-3.5" /> : <Alert className="size-3.5" />}
          {grounded ? r.findings.grounded : r.findings.fabrication}
        </div>
        {entailment?.checked ? (
          <EntailmentLine entailment={entailment} />
        ) : auditUnavailable ? (
          <div className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-3">
            <Alert className="size-3.5" />
            {r.findings.auditUnavailable}
          </div>
        ) : null}
      </div>
    </div>
  );
}
