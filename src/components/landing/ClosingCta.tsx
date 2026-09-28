import { CONTAINER, SECTION } from "./parts/landing-classes";
import { PrimaryLink } from "./parts/PrimaryLink";

export function ClosingCta() {
  return (
    <section aria-labelledby="cta-title" className={SECTION}>
      <div className={`${CONTAINER} flex flex-wrap items-center justify-between gap-6 py-16`}>
        <div className="flex flex-col gap-2">
          <h2 id="cta-title" className="font-li-display text-[40px] leading-none font-semibold">
            Interrogate your own code.
          </h2>
          <p className="text-[15px] text-li-neutral-800">
            Point it at a repository and a line. See what the history really says.
          </p>
        </div>
        <PrimaryLink href="/app">Explain a line →</PrimaryLink>
      </div>
    </section>
  );
}
