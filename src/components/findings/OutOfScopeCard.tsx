import { useMessages } from "@/i18n/LocaleProvider";
import { Alert } from "../icons";
import { Pill, SectionLabel } from "../ui";

export function OutOfScopeCard({ answer, language }: { answer: string; language?: string }) {
  const m = useMessages();
  const f = m.report.findings;
  return (
    <section className="mt-6">
      <SectionLabel title={f.title} meta={f.outOfScopeMeta} />
      <div className="overflow-hidden rounded-[10px] border border-line bg-surface shadow-card">
        <div className="flex flex-wrap items-center gap-2.5 border-b border-line bg-surface-2 px-6 py-3.5">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-inset text-ink-3">
            <Alert className="size-3.5" />
          </span>
          <span className="text-[14px] font-semibold tracking-tight text-ink">{f.outOfScope}</span>
          <Pill tone="neutral">{m.verdict.label["out-of-scope"]}</Pill>
        </div>
        <div className="p-7">
          <p
            lang={answer ? language : undefined}
            className="max-w-[68ch] text-[15px] leading-[1.72] text-ink-2"
          >
            {answer || f.outOfScopeAnswer}
          </p>
        </div>
      </div>
    </section>
  );
}
