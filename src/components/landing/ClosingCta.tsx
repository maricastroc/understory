import { getMessages } from "@/i18n/server";
import { CONTAINER, SECTION } from "./parts/landing-classes";
import { PrimaryLink } from "./parts/PrimaryLink";

export async function ClosingCta() {
  const t = (await getMessages()).landing;
  return (
    <section aria-labelledby="cta-title" className={SECTION}>
      <div className={`${CONTAINER} flex flex-wrap items-center justify-between gap-6 py-16`}>
        <div className="flex flex-col gap-2">
          <h2 id="cta-title" className="font-li-display text-[40px] leading-none font-semibold">
            {t.closing.title}
          </h2>
          <p className="text-[15px] text-li-neutral-800">{t.closing.body}</p>
        </div>
        <PrimaryLink href="/app">{t.explainGo}</PrimaryLink>
      </div>
    </section>
  );
}
