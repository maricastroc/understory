"use client";

import Link from "next/link";
import { AccountMenu } from "../AccountMenu";
import { LangToggle } from "../LangToggle";
import { Braces, Logo, PullRequest } from "../icons";
import type { AuthUser } from "../investigator/use-auth";
import { useLanguage } from "../use-language";

const ACTION =
  "inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-line-2 bg-surface px-3 text-[13px] font-medium text-ink whitespace-nowrap transition-colors hover:bg-inset";

export function PrHeader({ user }: { user: AuthUser | null }) {
  const { language, setLanguage } = useLanguage();

  return (
    <header className="flex h-13 shrink-0 items-center gap-2 border-b border-line-2 bg-surface px-3 sm:gap-4 sm:px-4">
      <Link href="/" className="flex shrink-0 items-center pr-1 sm:pr-2">
        <Logo className="size-6.5 shrink-0 text-accent" />
        <span className="text-[15px] font-semibold tracking-tight whitespace-nowrap sm:text-[16px]">
          Git <span className="text-accent">Investigator</span>
        </span>
      </Link>

      <div className="hidden items-center gap-2 rounded-md border border-line-2 px-2.5 py-1.5 md:flex">
        <PullRequest className="size-3.5 text-ink-3" />
        <span className="font-mono text-[12.5px]">Explain a PR</span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <LangToggle language={language} onChange={setLanguage} className="h-8" />
        <Link href="/app" className={ACTION}>
          <Braces className="size-3.5 text-ink-3" />
          Explain a line
        </Link>
        <AccountMenu user={user} signInClassName={ACTION} showPlaceholder />
      </div>
    </header>
  );
}
