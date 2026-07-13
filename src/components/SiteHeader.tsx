"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AccountMenu } from "@/components/AccountMenu";
import { Logo } from "@/components/icons";
import { useAuth } from "@/components/investigator/use-auth";

const SIGN_IN =
  "inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-line-2 bg-surface px-2.5 text-[13px] font-medium text-ink whitespace-nowrap transition-colors hover:bg-inset sm:px-3.5";

type NavLink = { href: string; label: string; icon?: ReactNode };

export function SiteHeader({ secondary, cta }: { secondary?: NavLink; cta: NavLink }) {
  const user = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur-md">
      <nav className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-1">
          <Logo className="size-6.5 shrink-0 text-accent" />
          <span className="truncate text-[15px] font-semibold tracking-tight">
            Git <span className="text-accent">Investigator</span>
          </span>
        </Link>
        <span className="ml-3 hidden font-mono text-[11px] text-ink-3 sm:inline">
          {`// code archaeology`}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {secondary && (
            <Link
              href={secondary.href}
              className="hidden h-9 shrink-0 items-center gap-1.5 rounded-md border border-line-2 bg-surface px-3 text-[13px] font-medium whitespace-nowrap text-ink transition-colors hover:bg-inset sm:inline-flex"
            >
              {secondary.icon}
              {secondary.label}
            </Link>
          )}
          <Link
            href={cta.href}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-accent px-3.5 text-[13px] font-medium whitespace-nowrap text-white shadow-sm transition-colors hover:bg-accent-press"
          >
            {cta.icon}
            {cta.label}
          </Link>
          <AccountMenu user={user} signInClassName={SIGN_IN} />
        </div>
      </nav>
    </header>
  );
}
