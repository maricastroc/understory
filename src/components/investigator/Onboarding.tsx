"use client";

import { useEffect, useState } from "react";
import { Braces, Check, Close, Github, Repo, Search } from "../icons";
import { PANEL } from "../composer/composer-classes";
import { liButton } from "../line-investigation/parts/button-class";
import { authEnabled } from "./use-auth";

const KEY = "gi:onboarded";

const STEPS = [
  {
    icon: Repo,
    title: "Open a repository",
    body: "Paste a GitHub repo or a local path — a demo is already loaded to explore.",
  },
  {
    icon: Search,
    title: "Find a file, click a line",
    body: "Search by file name or symbol, then click the exact line you're curious about.",
  },
  {
    icon: Braces,
    title: "Ask, then read the grounded why",
    body: "Edit the question and investigate — every claim links to a real commit, PR, or issue.",
  },
];

export function Onboarding({ repoReady, signedIn }: { repoReady: boolean; signedIn: boolean }) {
  const [dismissed, setDismissed] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem(KEY) === "1") setDismissed(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* best-effort */
    }
  }

  if (dismissed) return null;

  const current = repoReady ? 1 : 0;

  return (
    <section
      aria-label="Getting started"
      className={`mb-4 overflow-hidden font-li-body text-li-ink ${PANEL}`}
    >
      <div className="flex items-center gap-2 border-b border-li-divider bg-li-paper px-4 py-2.5">
        <span className="font-li-mono text-[11px] tracking-[0.07em] text-li-text-subtle uppercase">
          Getting started
        </span>
        <span className="hidden text-xs text-li-text-subtle sm:inline">
          — from a line you don&apos;t understand to the decision behind it
        </span>
        <button
          type="button"
          aria-label="Dismiss guide"
          onClick={dismiss}
          className={liButton("icon", "-mr-1 ml-auto")}
        >
          <Close className="size-4" />
        </button>
      </div>

      <ol className="grid gap-2.5 p-3.5 sm:grid-cols-3">
        {STEPS.map((step, i) => {
          const done = i < current;
          const active = i === current;
          const Icon = step.icon;
          return (
            <li
              key={step.title}
              aria-current={active ? "step" : undefined}
              className={`flex gap-2.5 border p-3 ${
                active ? "border-li-datum bg-li-datum-tint" : "border-li-divider bg-li-paper"
              }`}
            >
              <span
                className={`grid size-6 shrink-0 place-items-center rounded-full font-li-mono text-xs font-semibold ${
                  done
                    ? "bg-li-neutral-200 text-li-ink"
                    : active
                      ? "bg-li-datum-strong text-li-ink"
                      : "bg-li-neutral-200 text-li-text-muted"
                }`}
              >
                {done ? <Check className="size-3.5" /> : i + 1}
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[13px] font-semibold text-li-ink">
                  <Icon className="size-3.5 text-li-text-muted" />
                  {step.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-li-text-subtle">{step.body}</p>
              </div>
            </li>
          );
        })}
      </ol>

      {authEnabled && !signedIn && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-li-divider bg-li-steel-100/70 px-4 py-2.5 text-xs text-li-text-subtle">
          <Github className="size-3.5 shrink-0 text-li-steel-700" />
          <span>
            <b className="font-semibold text-li-ink">Sign in with GitHub</b> to keep your cases
            across sessions and skip tokens — private repos included.
          </span>
          <a
            href="/api/auth/login"
            className={liButton("secondary", "ml-auto px-2.5 py-1 text-[12.5px]")}
          >
            <Github className="size-3.5" />
            Sign in
          </a>
        </div>
      )}
    </section>
  );
}
