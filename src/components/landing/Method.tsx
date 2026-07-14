import Link from "next/link";
import { ChevronRight, Shield } from "@/components/icons";
import { steps } from "./content";

export function Method() {
  return (
    <section id="how" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <p className="font-mono text-[12px] text-accent-press">{`// the method`}</p>
      <h2 className="mt-3 max-w-[22ch] text-[24px] font-semibold tracking-[-0.015em] text-balance sm:text-[27px]">
        From a line you don&apos;t understand to the decision behind it.
      </h2>
      <div className="mt-12 grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-3">
        {steps.map((s) => (
          <div key={s.n}>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[13px] font-semibold text-accent-press">{s.n}</span>
              <span className="h-px flex-1 bg-line" />
            </div>
            <h3 className="mt-4 text-[16px] font-semibold">{s.title}</h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{s.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-16 flex flex-col items-start gap-4 rounded-[14px] border border-line bg-surface-2 px-6 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div>
          <div className="flex items-center gap-2 text-good">
            <Shield className="size-4" />
            <span className="font-mono text-[11.5px] tracking-[0.06em] uppercase">open a case</span>
          </div>
          <h3 className="mt-2 text-[18px] font-semibold tracking-tight">
            Interrogate your own code.
          </h3>
          <p className="mt-1 text-[13.5px] text-ink-2">
            Point it at a repository and a line — see what the history really says.
          </p>
        </div>
        <Link
          href="/app"
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md bg-accent px-5 text-[14px] font-medium text-white shadow-sm transition-colors hover:bg-accent-press"
        >
          Explain a line
          <ChevronRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}
