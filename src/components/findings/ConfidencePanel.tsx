import type { Confidence } from "@/lib/types";
import { ConfidenceRing } from "../ConfidenceRing";
import { levelLabel } from "../format";
import { Alert, Check } from "../icons";

export function ConfidencePanel({
  confidence,
  grounded,
}: {
  confidence: Confidence;
  grounded: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-3 p-6 text-center">
      <ConfidenceRing confidence={confidence} size={88} />
      <div className="flex flex-col items-center gap-1">
        <div className="text-[15px] font-semibold tracking-tight text-ink">
          {levelLabel[confidence.level]} confidence
        </div>
        <div
          className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${
            grounded ? "text-good" : "text-crit"
          }`}
        >
          {grounded ? <Check className="size-3.5" /> : <Alert className="size-3.5" />}
          {grounded ? "Every citation grounded" : "Fabrication detected"}
        </div>
      </div>
    </div>
  );
}
