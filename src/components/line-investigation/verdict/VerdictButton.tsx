import { useMessages } from "@/i18n/LocaleProvider";
import type { Verdict } from "../model/types";
import { Check, ChevronDown } from "@/components/icons";

const CHIP: Record<Verdict, string> = {
  resolved:
    "border-li-evidence-edge/45 bg-li-evidence-tint text-li-evidence-ink hover:bg-li-evidence-quote",
  "not-recorded": "border-dashed border-li-gap bg-li-gap-tint text-li-gap-ink hover:bg-li-paper",
  "evidence-only": "border-li-ink text-li-ink hover:bg-li-neutral-200",
  "out-of-scope": "border-li-ink text-li-ink hover:bg-li-neutral-200",
  fabrication: "border-li-ink bg-li-ink text-li-paper hover:bg-li-neutral-800",
  pending: "border-li-divider text-li-text-subtle",
};

const ANSWERED = "border-li-divider text-li-ink hover:bg-li-neutral-200";

export function VerdictButton({
  verdict,
  reading = false,
  open,
  controls,
  onToggle,
}: {
  verdict: Verdict;
  reading?: boolean;
  open: boolean;
  controls: string;
  onToggle: () => void;
}) {
  const v = useMessages().verdict;
  const answered = reading && verdict === "resolved";
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={controls}
      aria-haspopup="dialog"
      onClick={onToggle}
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-[3px] border py-1 pr-2.5 pl-2 text-[13px] font-semibold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-li-focus ${answered ? ANSWERED : CHIP[verdict]}`}
    >
      {verdict === "resolved" && !answered && <Check className="size-[13px]" />}
      {answered ? v.answered : v.label[verdict]}
      <ChevronDown className="size-3.5 opacity-80" />
    </button>
  );
}
