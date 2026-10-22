import { useMessages } from "@/i18n/LocaleProvider";
import { DomainIcon } from "../line-investigation/parts/DomainIcon";
import { SECTION_LABEL } from "./composer-classes";
import type { RecentRepo } from "./types/recent-repo";

const ROW =
  "group grid w-full cursor-pointer grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-3 border-b border-li-divider py-3 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-li-focus";
const ACTION =
  "text-[13px] whitespace-nowrap text-li-ink underline decoration-li-neutral-400 underline-offset-3 transition-colors group-hover:decoration-li-ink";

export function RepoShortcuts({
  recent,
  demoRepo,
  onOpen,
  onOpenDemo,
}: {
  recent: RecentRepo[];
  demoRepo: string | null;
  onOpen: (path: string) => void;
  onOpenDemo: () => void;
}) {
  const t = useMessages().composer.repo;
  const demoInRecent = !!demoRepo && recent.some((r) => r.path === demoRepo);
  if (!recent.length && !demoRepo) return null;
  return (
    <section aria-label={t.shortcuts} className="flex flex-col">
      <h3 className={SECTION_LABEL}>{recent.length ? t.investigatedBefore : t.tryItOn}</h3>
      <ul>
        {recent.map((r) => (
          <li key={r.path}>
            <button type="button" onClick={() => onOpen(r.path)} className={ROW}>
              <DomainIcon kind="repository" />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate font-li-mono text-[14px] text-li-ink">{r.name}</span>
                <span className="text-[12.5px] text-li-neutral-800">
                  {t.investigations(r.investigations)}
                  {r.path === demoRepo ? ` · ${t.demoRepository}` : ""}
                </span>
              </span>
              <span className={ACTION}>{t.openAction}</span>
            </button>
          </li>
        ))}
        {demoRepo && !demoInRecent && (
          <li>
            <button type="button" onClick={onOpenDemo} className={ROW}>
              <DomainIcon kind="repository" />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate font-li-mono text-[14px] text-li-ink">
                  {demoRepo.split("/").filter(Boolean).pop()}
                </span>
                <span className="text-[12.5px] text-li-neutral-800">{t.demoLead}</span>
              </span>
              <span className={ACTION}>{t.openDemo}</span>
            </button>
          </li>
        )}
      </ul>
    </section>
  );
}
