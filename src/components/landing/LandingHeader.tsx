"use client";

import Link from "next/link";
import { AccountMenu } from "@/components/AccountMenu";
import { Logo } from "@/components/icons";
import { useAuth } from "@/components/investigator/use-auth";

export function LandingHeader() {
  const user = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur-md">
      <nav className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <span className="flex min-w-0 items-center gap-1">
          <Logo className="size-6.5 shrink-0 text-accent" />
          <span className="truncate text-[15px] font-semibold tracking-tight">
            Git <span className="text-accent">Investigator</span>
          </span>
        </span>
        <span className="ml-3 hidden font-mono text-[11px] text-ink-3 sm:inline">
          {`// code archaeology`}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <AccountMenu
            user={user}
            signInClassName="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-line-2 bg-surface px-2.5 text-[13px] font-medium text-ink whitespace-nowrap transition-colors hover:bg-inset sm:px-3.5"
          />
          <Link
            href="/app"
            className="inline-flex h-9 shrink-0 items-center rounded-md bg-accent px-3.5 text-[13px] font-medium whitespace-nowrap text-white shadow-sm transition-colors hover:bg-accent-press"
          >
            Open app
          </Link>
        </div>
      </nav>
    </header>
  );
}
