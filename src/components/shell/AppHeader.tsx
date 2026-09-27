"use client";

import Link from "next/link";
import type { AuthUser } from "../investigator/use-auth";
import { Menu } from "../icons";
import { BlueprintCorners } from "../line-investigation/parts/BlueprintCorners";
import { liButton } from "../line-investigation/parts/button-class";
import { useLanguage } from "../use-language";
import { AccountButton } from "./AccountButton";
import { BrandMark } from "./BrandMark";
import { HeaderSearch } from "./HeaderSearch";
import { LanguageSwitch } from "./LanguageSwitch";
import { RepoSelector } from "./RepoSelector";
import type { RailItem, RepoSummary } from "./types";

export function AppHeader({
  repo,
  onNewInRepo,
  cases,
  onSelectCase,
  fileSearch,
  onOpenFile,
  crossLink,
  onNewInvestigation,
  user,
  onMenuClick,
}: {
  repo: RepoSummary | null;
  onNewInRepo?: () => void;
  cases: RailItem[];
  onSelectCase: (item: RailItem) => void;
  fileSearch: { repoPath: string; enabled: boolean; token?: string } | null;
  onOpenFile?: (path: string) => void;
  crossLink: "pr" | "line";
  onNewInvestigation?: () => void;
  user: AuthUser | null;
  onMenuClick: () => void;
}) {
  const { language, setLanguage } = useLanguage();
  const newLabel = (
    <>
      <BlueprintCorners />
      <span aria-hidden className="min-[640px]:hidden">
        +
      </span>
      <span className="max-[640px]:sr-only">New investigation</span>
    </>
  );

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4.5 border-b border-li-divider bg-li-paper px-5 font-li-body text-li-ink max-[820px]:gap-3 max-[820px]:px-4">
      <button
        type="button"
        aria-label="Open cases"
        onClick={onMenuClick}
        className="-ml-1 grid size-8 shrink-0 cursor-pointer place-items-center rounded text-li-ink hover:bg-li-neutral-200 min-[820px]:hidden"
      >
        <Menu className="size-5" />
      </button>
      <BrandMark />
      <span aria-hidden className="h-5 w-px shrink-0 bg-li-divider max-[820px]:hidden" />
      {repo && (
        <div className="max-w-96 min-w-0 shrink max-[820px]:hidden">
          <RepoSelector repo={repo} onNewInRepo={onNewInRepo} />
        </div>
      )}
      <HeaderSearch
        cases={cases}
        onSelectCase={onSelectCase}
        files={fileSearch}
        onOpenFile={onOpenFile}
      />
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <LanguageSwitch language={language} onChange={setLanguage} />
        {crossLink === "pr" ? (
          <Link href="/pr" className={liButton("secondary", "max-[640px]:hidden")}>
            Explain a PR
          </Link>
        ) : (
          <Link href="/app" className={liButton("secondary", "max-[640px]:hidden")}>
            Explain a line
          </Link>
        )}
        {onNewInvestigation ? (
          <button type="button" onClick={onNewInvestigation} className={liButton("primary")}>
            {newLabel}
          </button>
        ) : (
          <Link href="/app" className={liButton("primary")}>
            {newLabel}
          </Link>
        )}
        <AccountButton user={user} />
      </div>
    </header>
  );
}
