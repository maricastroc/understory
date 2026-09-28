"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Github } from "../icons";
import { type AuthUser, authEnabled } from "../investigator/use-auth";
import { liButton } from "../line-investigation/parts/button-class";
import { initials } from "./initials";
import { useDismiss } from "./use-dismiss";

export function AccountButton({
  user,
  signIn = "secondary",
}: {
  user: AuthUser | null;
  signIn?: "secondary" | "ghost";
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const refs = useMemo(() => [trigger, menu], []);
  useDismiss(open, refs, close);

  if (!user) {
    if (!authEnabled) return null;
    if (signIn === "ghost") {
      return (
        <a href="/api/auth/login" className={liButton("ghost", "max-[640px]:px-1.5")}>
          Sign in
        </a>
      );
    }
    return (
      <a href="/api/auth/login" className={liButton("secondary")}>
        <Github className="size-4 shrink-0" />
        <span className="max-[640px]:sr-only">Sign in with GitHub</span>
      </a>
    );
  }

  return (
    <div className="relative">
      <button
        ref={trigger}
        type="button"
        aria-label={`Account: ${user.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="ml-1 grid size-8 cursor-pointer place-items-center rounded-full bg-li-ink text-xs font-semibold text-li-paper transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-li-focus"
      >
        {initials(user.name)}
      </button>
      {open && (
        <div
          ref={menu}
          role="menu"
          className="absolute top-10 right-0 z-40 w-52 border border-li-divider bg-li-paper shadow-li-lg"
        >
          <div className="border-b border-li-divider px-3.5 py-3">
            <div className="truncate text-[13px] font-semibold text-li-ink">{user.name}</div>
            <div className="truncate font-li-mono text-[11.5px] text-li-text-subtle">
              @{user.login}
            </div>
          </div>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              role="menuitem"
              className="w-full cursor-pointer px-3.5 py-2.5 text-left text-[13px] text-li-ink hover:bg-li-neutral-200 focus-visible:bg-li-neutral-200 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-li-focus"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
