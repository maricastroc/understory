import Link from "next/link";
import { liButton } from "../line-investigation/parts/button-class";
import { CONTAINER, H2, KICKER, LEAD, SECTION } from "./parts/landing-classes";
import { PrDiagram } from "./pr/PrDiagram";

export function PrScale() {
  return (
    <section aria-labelledby="pr-scale-title" className={SECTION}>
      <div
        className={`${CONTAINER} grid grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] items-center gap-12 py-18`}
      >
        <div className="flex max-w-115 flex-col gap-4">
          <p className={KICKER}>at pull-request scale</p>
          <h2 id="pr-scale-title" className={H2}>
            Every region a PR changes, dug at once.
          </h2>
          <p className={LEAD}>
            Paste a GitHub PR. Each changed region descends into its own history, so you see which
            code rests on a real decision and which never had one.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/pr" className={liButton("secondary")}>
              Explain a PR →
            </Link>
            <span className={KICKER}>try chalk/chalk#664</span>
          </div>
        </div>
        <PrDiagram className="w-full max-w-130 justify-self-end max-[640px]:order-first" />
      </div>
    </section>
  );
}
