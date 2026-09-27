import { liButton } from "../line-investigation/parts/button-class";
import { HeroDemo } from "./demo/HeroDemo";
import { CONTAINER } from "./parts/landing-classes";
import { PrimaryLink } from "./parts/PrimaryLink";

export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className={`${CONTAINER} flex flex-col gap-18 pt-28 pb-24 max-[640px]:gap-12 max-[640px]:pt-14 max-[640px]:pb-16`}
    >
      <div className="flex max-w-200 flex-col items-start">
        <p className="font-li-mono text-[13px] text-li-neutral-700">
          <span className="text-li-ink">git blame</span> tells you{" "}
          <span className="text-li-ink">who</span> and <span className="text-li-ink">when</span>.
          This tells you <span className="font-medium text-li-ink">why</span>.
        </p>
        <h1
          id="hero-title"
          className="mt-5 font-li-display text-[clamp(56px,9vw,112px)] leading-[0.92] font-semibold tracking-[-0.015em] text-li-ink"
        >
          Why is this line{" "}
          <span className="underline decoration-li-datum decoration-[0.06em] underline-offset-[0.1em]">
            here?
          </span>
        </h1>
        <p className="mt-7 max-w-155 text-lg leading-[1.55] text-pretty text-li-neutral-800 max-[640px]:text-base">
          Git Investigator reconstructs the reasoning behind a line of code — tracing commits, pull
          requests, and issues back to the decision that introduced it.
        </p>
        <div className="mt-9 flex flex-wrap gap-2">
          <PrimaryLink href="/app">Explain a line →</PrimaryLink>
          <a href="#method" className={liButton("secondary")}>
            How it works
          </a>
        </div>
      </div>
      <HeroDemo />
    </section>
  );
}
