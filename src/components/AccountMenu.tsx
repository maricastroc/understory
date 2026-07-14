"use client";

import { useEffect, useRef, useState } from "react";
import { Github, User } from "./icons";
import { Avatar } from "./ui";
import { type AuthUser, authEnabled } from "./investigator/use-auth";

export function AccountMenu({
  user,
  signInClassName,
  showPlaceholder = false,
}: {
  user: AuthUser | null;
  signInClassName: string;
  showPlaceholder?: boolean;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape")
        setMenuOpen((open) => {
          if (open) triggerRef.current?.focus();
          return false;
        });
    }
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, []);

  if (user) {
    return (
      <div className="relative" ref={menuRef}>
        <button
          ref={triggerRef}
          type="button"
          aria-label="Account menu"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
          className="flex cursor-pointer items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
        >
          <Avatar name={user.name} src={user.avatarUrl} size={28} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 z-30 mt-2 w-52 overflow-hidden rounded-[10px] border border-line bg-surface shadow-panel">
            <div className="border-b border-line px-3.5 py-3">
              <div className="truncate text-[13px] font-semibold text-ink">{user.name}</div>
              <div className="truncate font-mono text-[11.5px] text-ink-3">@{user.login}</div>
            </div>
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="w-full cursor-pointer px-3.5 py-2.5 text-left text-[13px] font-medium text-ink-2 transition-colors hover:bg-inset hover:text-ink"
              >
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>
    );
  }

  if (authEnabled) {
    return (
      <a href="/api/auth/login" aria-label="Sign in" className={signInClassName}>
        <Github className="size-4 shrink-0" />
        <span className="hidden sm:inline">Sign in</span>
      </a>
    );
  }

  if (showPlaceholder) {
    return (
      <span
        title="Not signed in"
        className="grid size-7 place-items-center rounded-full border border-line-2 bg-inset text-ink-3"
      >
        <User className="size-4" />
      </span>
    );
  }

  return null;
}
