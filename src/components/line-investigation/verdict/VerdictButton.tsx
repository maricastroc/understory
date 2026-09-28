import { VERDICT_LABEL } from "../copy/verdict-copy";
import type { Verdict } from "../model/types";

const CHIP: Record<Verdict, string> = {
  resolved: "bg-li-evidence-tint text-li-evidence-ink hover:bg-li-evidence-quote",
  "not-recorded": "bg-li-gap-tint text-li-gap-ink hover:bg-li-neutral-200",
  "evidence-only": "border border-li-ink text-li-ink hover:bg-li-neutral-200",
  "out-of-scope": "border border-li-ink text-li-ink hover:bg-li-neutral-200",
  fabrication: "bg-li-ink text-li-paper hover:bg-li-neutral-800",
  pending: "border border-li-divider text-li-text-subtle",
};

export function VerdictButton({
  verdict,
  open,
  controls,
  onToggle,
}: {
  verdict: Verdict;
  open: boolean;
  controls: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={controls}
      aria-haspopup="dialog"
      onClick={onToggle}
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-[3px] py-1.25 pr-2.5 pl-2 text-[13px] font-semibold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-li-focus ${CHIP[verdict]}`}
    >
      {verdict === "resolved" && (
        <svg
          aria-hidden
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
      {VERDICT_LABEL[verdict]}
      <span aria-hidden className="font-normal opacity-80">
        ▾
      </span>
    </button>
  );
}
