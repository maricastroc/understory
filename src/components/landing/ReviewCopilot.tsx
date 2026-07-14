import Link from "next/link";
import { buttonClass } from "@/components/Button";
import { Check, ChevronRight, Commit, Issue, PullRequest, Review } from "@/components/icons";
import { reviewCopilot } from "./content";

const groundedIcon = {
  commit: <Commit className="size-3" />,
  pr: <PullRequest className="size-3" />,
  issue: <Issue className="size-3" />,
  review: <Review className="size-3" />,
};

export function ReviewCopilot() {
  const { tag, title, body, cta, example, finding } = reviewCopilot;

  return (
    <section className="border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div>
            <p className="font-mono text-[12px] text-accent-press">{tag}</p>
            <h2 className="mt-3 max-w-[20ch] text-[24px] font-semibold tracking-[-0.015em] text-balance sm:text-[28px]">
              {title}
            </h2>
            <p className="mt-4 max-w-[52ch] text-[14.5px] leading-relaxed text-ink-2">{body}</p>
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <Link href="/pr" className={buttonClass({ size: "lg" })}>
                {cta}
                <ChevronRight className="size-4" />
              </Link>
              <span className="font-mono text-[12.5px] text-ink-3">
                try <span className="text-ink-2">{example}</span>
              </span>
            </div>
          </div>

          <div className="flex flex-col rounded-xl border border-line bg-surface p-5 shadow-[0_10px_40px_rgba(20,22,30,0.06)]">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-5.5 items-center gap-1.5 rounded-full bg-good-tint px-2.5 text-[11.5px] font-semibold text-good">
                <span className="size-1.5 rounded-full bg-good" />
                {finding.confidence}
              </span>
              <span className="font-mono text-[11.5px] text-ink-2">{finding.target}</span>
              <span className="ml-auto rounded bg-inset px-2 py-0.5 font-mono text-[10.5px] text-ink-3">
                #1 of 6
              </span>
            </div>

            <p className="mt-4 text-[13.5px] leading-relaxed text-ink-body">{finding.why}</p>

            <div className="mt-auto border-t border-line pt-3">
              <div className="mb-2 font-mono text-[10.5px] tracking-[0.06em] text-ink-3 uppercase">
                grounded in
              </div>
              <div className="flex flex-wrap gap-1.5">
                {finding.grounded.map((g) => (
                  <span
                    key={g.id}
                    className="inline-flex items-center gap-1.5 rounded-md border border-line bg-inset px-2 py-1 font-mono text-[11px] text-ink-2"
                  >
                    <Check className="size-3 text-good" />
                    {groundedIcon[g.kind]}
                    {g.id}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
