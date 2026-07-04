"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { basename } from "../format";
import { Github, Logo, Plus, Search } from "../icons";
import { Avatar } from "../ui";

export function Header({
  repoPath,
  filter,
  onFilterChange,
  onNewInvestigation,
  onSignIn,
  user,
}: {
  repoPath: string;
  filter: string;
  onFilterChange: (v: string) => void;
  onNewInvestigation: () => void;
  onSignIn?: () => void;
  user?: { name: string } | null;
}) {
  const searchRef = useRef<HTMLInputElement>(null);

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
    <header className="flex h-13 shrink-0 items-center gap-4 border-b border-line-2 bg-surface px-4">
      <Link href="/" className="flex items-center gap-2.5 pr-2">
        <Logo className="size-6 text-accent" />
        <span className="text-[13.5px] font-semibold tracking-tight">Git Investigator</span>
      </Link>

      <div className="hidden items-center gap-2 rounded-md border border-line-2 px-2.5 py-1.5 md:flex">
        <span className="size-1.5 rounded-full bg-good" />
        <span className="font-mono text-[12.5px]">{basename(repoPath)}</span>
      </div>

      <div className="hidden max-w-105 flex-1 items-center gap-2 rounded-md border border-line-2 bg-inset px-3 py-1.5 text-ink-3 transition-[background-color,border-color,box-shadow] focus-within:border-accent/40 focus-within:bg-surface focus-within:ring-2 focus-within:ring-accent/10 hover:bg-surface lg:flex">
        <Search className="size-3.5 shrink-0" />
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
        <button
          onClick={onNewInvestigation}
          className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-accent px-3 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-accent-press"
        >
          <Plus className="size-3.5" />
          New investigation
        </button>
        {user ? (
          <Avatar name={user.name} size={28} />
        ) : (
          <button
            type="button"
            onClick={onSignIn}
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-line-2 bg-surface px-3 text-[13px] font-medium text-ink transition-colors hover:bg-inset"
          >
            <Github className="size-4" />
            Sign in
          </button>
        )}
      </div>
    </header>
  );
}
