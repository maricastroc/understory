import { useMessages } from "@/i18n/LocaleProvider";
import { SectionLabel } from "../ui";

export function FindingsPending() {
  const f = useMessages().report.findings;
  return (
    <section className="mt-6">
      <SectionLabel title={f.title} meta={f.pendingMeta} />

      <div className="overflow-hidden rounded-[10px] border border-line bg-surface shadow-card">
        <div
          role="status"
          className="flex items-center gap-2.5 border-b border-line bg-surface-2 px-6 py-3.5"
        >
          <span
            aria-hidden
            className="size-4 animate-spin rounded-full border-2 border-line-2 border-t-accent"
          />
          <span className="text-[14px] font-semibold tracking-tight text-ink">{f.pending}</span>
        </div>

        <div className="p-7">
          <div className="max-w-[68ch] space-y-2.5" aria-hidden>
            <div className="h-3.5 w-[94%] animate-pulse rounded bg-ink/10" />
            <div className="h-3.5 w-[81%] animate-pulse rounded bg-ink/10" />
            <div className="h-3.5 w-[88%] animate-pulse rounded bg-ink/10" />
          </div>
          <p className="mt-5 text-[12.5px] text-ink-3">{f.pendingBody}</p>
        </div>
      </div>
    </section>
  );
}
