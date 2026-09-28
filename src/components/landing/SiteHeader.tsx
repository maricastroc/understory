"use client";

import { useAuth } from "../investigator/use-auth";
import { AccountButton } from "../shell/AccountButton";
import { BrandMark } from "../shell/BrandMark";
import { CONTAINER } from "./parts/landing-classes";
import { PrimaryLink } from "./parts/PrimaryLink";

export function SiteHeader() {
  const user = useAuth();
  return (
    <header className="sticky top-0 z-30 border-b border-li-divider bg-li-paper">
      <div className={`${CONTAINER} flex h-15 items-center gap-4`}>
        <BrandMark />
        <span className="font-li-mono text-xs text-li-text-muted max-[640px]:hidden">
          code archaeology
        </span>
        <nav aria-label="Main" className="ml-auto flex items-center gap-2">
          <PrimaryLink href="/app">Explain a line</PrimaryLink>
          <AccountButton user={user} signIn="ghost" />
        </nav>
      </div>
    </header>
  );
}
