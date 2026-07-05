import { Alert } from "../icons";
import { Pill, SectionLabel } from "../ui";

export function OutOfScopeCard({ answer }: { answer: string }) {
  return (
    <section className="mt-6">
      <SectionLabel
        title="Findings"
        meta="The question could not be matched to this code's history"
      />
      <div className="overflow-hidden rounded-[10px] border border-line bg-surface shadow-card">
        <div className="flex flex-wrap items-center gap-2.5 border-b border-line bg-surface-2 px-6 py-3.5">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-inset text-ink-3">
            <Alert className="size-3.5" />
          </span>
          <span className="text-[14px] font-semibold tracking-tight text-ink">
            Question outside investigation scope
          </span>
          <Pill tone="neutral">Out of scope</Pill>
        </div>
        <div className="p-7">
          <p className="max-w-[68ch] text-[15px] leading-[1.72] text-ink-2">
            {answer ||
              "This question can't be answered from the selected code and its history. Try asking why the line exists, changed, or was introduced."}
          </p>
        </div>
      </div>
    </section>
  );
}
