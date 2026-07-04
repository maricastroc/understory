import Link from "next/link";
import { ConfidenceRing } from "@/components/ConfidenceRing";
import { Check, ChevronRight, Commit, Issue, PullRequest } from "@/components/icons";
import { codeLines, sampleConfidence } from "./content";

const grounded = [
  { icon: <Commit className="size-3" />, id: "commit:c038fb3" },
  { icon: <PullRequest className="size-3" />, id: "pr:812" },
  { icon: <Issue className="size-3" />, id: "issue:1187" },
];

export function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-16 pb-20 sm:px-6 lg:pt-20">
      <p className="font-mono text-[12.5px] text-ink-3">
        <span className="text-accent-press">git blame</span> tells you{" "}
        <span className="text-ink">who</span> and <span className="text-ink">when</span>. This tells
        you <span className="text-ink">why</span>.
      </p>

      <h1 className="mt-5 max-w-[18ch] font-mono text-[34px] leading-[1.06] font-semibold tracking-[-0.03em] sm:text-[56px]">
        Why is this <span className="text-accent">line</span> here?
        <span
          aria-hidden
          className="ml-2 inline-block h-[0.82em] w-[0.5ch] translate-y-[0.06em] animate-pulse bg-accent align-baseline motion-reduce:animate-none"
        />
      </h1>

      <p className="mt-6 max-w-[58ch] font-sans text-[15px] leading-relaxed text-ink-2 sm:text-[16px]">
        Git Investigator reconstructs the reasoning behind a line of code — tracing the commits, pull
        requests, and issues that shaped it — and cites every source you can click. When the history
        doesn&apos;t explain it, it tells you, instead of inventing a reason.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link
          href="/app"
          className="inline-flex h-11 items-center gap-2 rounded-md bg-accent px-5 text-[14px] font-medium text-white shadow-sm transition-colors hover:bg-accent-press"
        >
          Open a case
          <ChevronRight className="size-4" />
        </Link>
        <a
          href="#how"
          className="inline-flex h-11 items-center rounded-md border border-line-2 bg-surface px-5 text-[14px] font-medium text-ink transition-colors hover:bg-inset"
        >
          How it works
        </a>
      </div>

      <div className="mt-14 grid grid-cols-1 gap-0 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-stretch">
        <div className="overflow-hidden rounded-t-xl border border-line bg-surface shadow-[0_10px_40px_rgba(20,22,30,0.06)] lg:rounded-l-xl lg:rounded-tr-none lg:border-r-0">
          <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-4 py-2.5 font-mono text-[12px] text-ink-3">
            <span className="text-ink-2">payments-service</span>
            <span>/</span>
            <span className="truncate text-ink-2">src/billing/charge.ts</span>
            <span className="ml-auto shrink-0 rounded bg-inset px-2 py-0.5 text-[11px]">
              git blame
            </span>
          </div>
          <div className="overflow-x-auto py-2 font-mono text-[12.5px] leading-[1.7]">
            {codeLines.map((l) => (
              <div key={l.n} className={`flex items-center px-1 ${l.hot ? "bg-accent-tint" : ""}`}>
                <span
                  className={`w-10 shrink-0 pr-3 text-right select-none ${l.hot ? "text-accent-press" : "text-ink-3"}`}
                >
                  {l.n}
                </span>
                <code className="pr-4 whitespace-pre text-ink">{l.text || " "}</code>
                {l.hot && (
                  <span className="ml-auto flex shrink-0 items-center gap-1 pr-3 text-[11px] font-semibold whitespace-nowrap text-accent-press">
                    ◀ why exactly 3?
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col rounded-b-xl border border-line bg-surface p-5 shadow-[0_10px_40px_rgba(20,22,30,0.06)] lg:rounded-r-xl lg:rounded-bl-none">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-5.5 items-center gap-1.5 rounded-full bg-good-tint px-2.5 text-[11.5px] font-semibold text-good">
              <span className="size-1.5 rounded-full bg-good" />
              Solved
            </span>
            <span className="font-mono text-[11px] text-ink-3">GI-2049</span>
            <div className="ml-auto">
              <ConfidenceRing confidence={sampleConfidence} size={64} />
            </div>
          </div>

          <p className="mt-4 text-[13.5px] leading-relaxed text-[#2a2d36]">
            Capped at three after an unbounded loop double-billed customers during a Stripe outage —
            three attempts stay inside the 10-second webhook window.
          </p>

          <div className="mt-auto border-t border-line pt-3">
            <div className="mb-2 font-mono text-[10.5px] tracking-[0.06em] text-ink-3 uppercase">
              grounded in
            </div>
            <div className="flex flex-wrap gap-1.5">
              {grounded.map((g) => (
                <span
                  key={g.id}
                  className="inline-flex items-center gap-1.5 rounded-md border border-line bg-inset px-2 py-1 font-mono text-[11px] text-ink-2"
                >
                  <Check className="size-3 text-good" />
                  {g.icon}
                  {g.id}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
