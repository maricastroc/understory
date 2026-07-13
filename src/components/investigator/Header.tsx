"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { AccountMenu } from "../AccountMenu";
import { LangToggle } from "../LangToggle";
import { basename } from "../format";
import { Logo, Menu, PullRequest, Search } from "../icons";
import { useLanguage } from "../use-language";
import { type AuthUser } from "./use-auth";

export function Header({
  repoPath,
  filter,
  onFilterChange,
  onMenuClick,
  user,
}: {
  repoPath: string;
  filter: string;
  onFilterChange: (v: string) => void;
  onMenuClick?: () => void;
  user?: AuthUser | null;
}) {
  const searchRef = useRef<HTMLInputElement>(null);
  const { language, setLanguage } = useLanguage();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="flex h-13 shrink-0 items-center gap-2 border-b border-line-2 bg-surface px-3 sm:gap-4 sm:px-4">
      {onMenuClick && (
        <button
          type="button"
          aria-label="Open investigations menu"
          onClick={onMenuClick}
          className="-ml-1 grid size-9 shrink-0 cursor-pointer place-items-center rounded-md text-ink-2 transition-colors hover:bg-inset hover:text-ink md:hidden"
        >
          <Menu className="size-5" />
        </button>
      )}

      <Link href="/" className="flex shrink-0 items-center pr-1 sm:pr-2">
        <Logo className="size-6.5 shrink-0 text-accent" />
        <span className="text-[15px] font-semibold tracking-tight whitespace-nowrap sm:text-[16px]">
          Git <span className="text-accent">Investigator</span>
        </span>
      </Link>

      <div className="hidden items-center gap-2 rounded-md border border-line-2 px-2.5 py-1.5 md:flex">
        <span className="size-1.5 rounded-full bg-good" />
        <span className="font-mono text-[12.5px]">{basename(repoPath)}</span>
      </div>

      <div className="hidden max-w-105 flex-1 items-center gap-2 rounded-md border border-line-2 bg-inset px-3 py-1.5 text-ink-2 shadow-sm transition-[background-color,border-color,box-shadow] focus-within:border-accent/40 focus-within:bg-surface focus-within:ring-2 focus-within:ring-accent/10 hover:bg-surface lg:flex">
        <Search className="size-3.5 shrink-0 text-ink-2" />
        <input
          ref={searchRef}
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          placeholder="Search investigations…"
          aria-label="Search investigations"
          className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-3"
        />
        <span className="flex shrink-0 gap-1">
          <kbd className="rounded border border-line-2 bg-surface px-1.5 font-mono text-[11px]">
            ⌘
          </kbd>
          <kbd className="rounded border border-line-2 bg-surface px-1.5 font-mono text-[11px]">
            K
          </kbd>
        </span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <LangToggle language={language} onChange={setLanguage} className="h-8" />
        <Link
          href="/pr"
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-line-2 bg-surface px-3 text-[13px] font-medium whitespace-nowrap text-ink transition-colors hover:bg-inset"
        >
          <PullRequest className="size-3.5 text-ink-3" />
          <span className="hidden sm:inline">Explain a PR</span>
        </Link>

        <AccountMenu
          user={user ?? null}
          signInClassName="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-line-2 bg-surface px-3 text-[13px] font-medium text-ink whitespace-nowrap transition-colors hover:bg-inset"
          showPlaceholder
        />
      </div>
    </header>
  );
}
