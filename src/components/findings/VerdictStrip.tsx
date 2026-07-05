import { Alert, Check } from "../icons";
import { Pill } from "../ui";

export function VerdictStrip({ recorded }: { recorded: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 border-b border-line bg-surface-2 px-6 py-3.5">
      <span
        className={`grid size-6 shrink-0 place-items-center rounded-full ${
          recorded ? "bg-good-tint text-good" : "bg-warn-tint text-warn"
        }`}
      >
        {recorded ? <Check className="size-3.5" /> : <Alert className="size-3.5" />}
      </span>
      <span className="text-[14px] font-semibold tracking-tight text-ink">
        {recorded ? "Investigation conclusion" : "No conclusion on record"}
      </span>
      <Pill tone={recorded ? "good" : "warn"} dot>
        {recorded ? "Resolved" : "Inconclusive"}
      </Pill>
    </div>
  );
}
