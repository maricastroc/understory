import { getMessages } from "@/i18n/server";
import { CONTAINER } from "./parts/landing-classes";

export async function SiteFooter() {
  const t = (await getMessages()).landing;
  return (
    <footer className="border-t border-li-divider">
      <div
        className={`${CONTAINER} flex flex-wrap justify-between gap-4 py-6 font-li-mono text-xs text-li-neutral-700`}
      >
        <span>understory · Mariana Castro</span>
        <span>{t.standard.kicker}</span>
      </div>
    </footer>
  );
}
