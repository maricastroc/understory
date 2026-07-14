"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { AccountMenu } from "../AccountMenu";
import { LangToggle } from "../LangToggle";
import { basename } from "../format";
import { Braces, Logo, Menu, PullRequest, Search } from "../icons";
import { useLanguage } from "../use-language";
import { type AuthUser } from "../investigator/use-auth";

const CROSS_LINK =
  "inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-line-2 bg-surface px-3 text-[13px] font-medium text-ink whitespace-nowrap transition-colors hover:bg-inset";

type LineProps = {
  mode: "line";
  repoPath: string;
  filter: string;
  onFilterChange: (v: string) => void;
};

type PrProps = {
  mode: "pr";
};

type AppHeaderProps = (LineProps | PrProps) & {
  user?: AuthUser | null;
  onMenuClick?: () => void;
};

export function AppHeader(props: AppHeaderProps) {
  const { language, setLanguage } = useLanguage();
  const searchRef = useRef<HTMLInputElement>(null);
  const isLine = props.mode === "line";

  useEffect(() => {
    if (!isLine) return;
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isLine]);

  return (
    <header className="flex h-13 shrink-0 items-center gap-2 border-b border-line-2 bg-surface px-3 sm:gap-4 sm:px-4">
      {props.onMenuClick && (
        <button
          type="button"
          aria-label={isLine ? "Open investigations menu" : "Open pull requests menu"}
          onClick={props.onMenuClick}
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

      {isLine ? (
        <div className="hidden items-center gap-2 rounded-md border border-line-2 px-2.5 py-1.5 md:flex">
          <span className="size-1.5 rounded-full bg-good" />
          <span className="font-mono text-[12.5px]">{basename(props.repoPath)}</span>
        </div>
      ) : (
        <div className="hidden items-center gap-2 rounded-md border border-line-2 px-2.5 py-1.5 md:flex">
          <PullRequest className="size-3.5 text-ink-3" />
          <span className="font-mono text-[12.5px]">Explain a PR</span>
        </div>
      )}

      {props.mode === "line" && (
        <div className="hidden max-w-105 flex-1 items-center gap-2 rounded-md border border-line-2 bg-inset px-3 py-1.5 text-ink-2 shadow-sm transition-[background-color,border-color,box-shadow] focus-within:border-accent/40 focus-within:bg-surface focus-within:ring-2 focus-within:ring-accent/10 hover:bg-surface lg:flex">
          <Search className="size-3.5 shrink-0 text-ink-2" />
          <input
            ref={searchRef}
            value={props.filter}
            onChange={(e) => props.onFilterChange(e.target.value)}
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
      )}

      <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
        <LangToggle language={language} onChange={setLanguage} className="h-8" />
        {isLine ? (
          <Link href="/pr" aria-label="Explain a PR" className={CROSS_LINK}>
            <PullRequest className="size-3.5 text-ink-3" />
            <span className="hidden sm:inline">Explain a PR</span>
          </Link>
        ) : (
          <Link href="/app" aria-label="Explain a line" className={CROSS_LINK}>
            <Braces className="size-3.5 text-ink-3" />
            <span className="hidden sm:inline">Explain a line</span>
          </Link>
        )}
        <AccountMenu user={props.user ?? null} signInClassName={CROSS_LINK} showPlaceholder />
      </div>
    </header>
  );
}
