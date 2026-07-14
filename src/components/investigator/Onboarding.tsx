"use client";

import { useEffect, useState } from "react";
import { buttonClass } from "../Button";
import { Braces, Check, Close, Github, Repo, Search } from "../icons";
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
      className="mb-4 overflow-hidden rounded-[10px] border border-line bg-surface shadow-card"
    >
      <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-4 py-2.5">
        <span className="text-[11px] font-semibold tracking-[0.07em] text-ink-2 uppercase">
          Getting started
        </span>
        <span className="hidden text-[12px] text-ink-3 sm:inline">
          — from a line you don&apos;t understand to the decision behind it
        </span>
        <button
          type="button"
          aria-label="Dismiss guide"
          onClick={dismiss}
          className="-mr-1 ml-auto grid size-7 cursor-pointer place-items-center rounded-md text-ink-3 transition-colors hover:bg-inset hover:text-ink"
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
              className={`flex gap-2.5 rounded-md border p-3 transition-colors ${
                active ? "border-accent/40 bg-accent-tint/25" : "border-line bg-surface"
              }`}
            >
              <span
                className={`grid size-6 shrink-0 place-items-center rounded-full text-[12px] font-semibold ${
                  done
                    ? "bg-good-tint text-good"
                    : active
                      ? "bg-accent text-white"
                      : "bg-inset text-ink-3"
                }`}
              >
                {done ? <Check className="size-3.5" /> : i + 1}
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                  <Icon className="size-3.5 text-ink-3" />
                  {step.title}
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-2">{step.body}</p>
              </div>
            </li>
          );
        })}
      </ol>

      {authEnabled && !signedIn && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-line bg-accent-tint/20 px-4 py-2.5 text-[12px] text-ink-2">
          <Github className="size-3.5 shrink-0 text-accent-press" />
          <span>
            <b className="font-semibold text-ink">Sign in with GitHub</b> to keep your cases across
            sessions and skip tokens — private repos included.
          </span>
          <a href="/api/auth/login" className={`ml-auto ${buttonClass({ size: "xs" })}`}>
            <Github className="size-3.5" />
            Sign in
          </a>
        </div>
      )}
    </section>
  );
}
