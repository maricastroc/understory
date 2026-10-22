"use client";

import { useMessages } from "@/i18n/LocaleProvider";
import { useAuth } from "../investigator/use-auth";
import { AccountButton } from "../shell/AccountButton";
import { BrandMark } from "../shell/BrandMark";
import { LocaleMenu } from "../shell/LocaleMenu";
import { CONTAINER } from "./parts/landing-classes";
import { PrimaryLink } from "./parts/PrimaryLink";

export function SiteHeader() {
  const user = useAuth();
  const t = useMessages().landing;
  return (
    <header className="sticky top-0 z-30 border-b border-li-divider bg-li-paper">
      <div className={`${CONTAINER} flex h-15 items-center gap-4`}>
        <BrandMark />
        <span className="font-li-mono text-xs text-li-text-muted max-[640px]:hidden">
          {t.tagline}
        </span>
        <nav aria-label={t.nav} className="ml-auto flex items-center gap-2">
          <LocaleMenu />
          <PrimaryLink href="/app">{t.explain}</PrimaryLink>
          <AccountButton user={user} signIn="ghost" />
        </nav>
      </div>
    </header>
  );
}
