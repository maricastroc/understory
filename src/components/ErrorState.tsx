"use client";

import { Alert, Github } from "./icons";
import { authEnabled } from "./investigator/use-auth";
import { liButton } from "./line-investigation/parts/button-class";

type Category = "private" | "rate" | "network" | "generic";

function categorize(msg: string): Category {
  const m = msg.toLowerCase();
  if (/404|not found|\b403\b|private|permission|forbidden/.test(m)) return "private";
  if (/rate.?limit|\b429\b|too many/.test(m)) return "rate";
  if (/network|fetch failed|timed? ?out|unreachable|econn|enotfound|failed to fetch/.test(m))
    return "network";
  return "generic";
}

const HINT: Record<Category, string> = {
  private: "This repository looks private or doesn't exist.",
  rate: "GitHub's rate limit was hit.",
  network: "Couldn't reach the server — check your connection.",
  generic: "",
};

export function ErrorState({
  id,
  message,
  onRetry,
  signedIn = false,
  flush = false,
}: {
  id?: string;
  message: string;
  onRetry?: () => void;
  signedIn?: boolean;
  flush?: boolean;
}) {
  const category = categorize(message);
  const suggestSignIn = authEnabled && !signedIn && (category === "private" || category === "rate");
  const hint = HINT[category];

  return (
    <div
      id={id}
      role="alert"
      className={`flex items-start gap-2.5 bg-li-neutral-100 font-li-body text-li-ink ${
        flush
          ? "border-b border-li-divider px-3.5 py-2.5"
          : "border border-li-divider p-3.5 shadow-li-sm"
      }`}
    >
      <Alert className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[13px]">{message}</p>
        {(hint || suggestSignIn) && (
          <p className="mt-1 text-[12.5px] text-li-text-subtle">
            {hint}
            {suggestSignIn && " Signing in with GitHub is the easiest fix — no token needed."}
          </p>
        )}
        {(suggestSignIn || onRetry) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {suggestSignIn && (
              <a
                href="/api/auth/login"
                className={liButton("secondary", "px-2.5 py-1 text-[12.5px]")}
              >
                <Github className="size-3.5" />
                Sign in with GitHub
              </a>
            )}
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className={liButton("secondary", "px-2.5 py-1 text-[12.5px]")}
              >
                Try again
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
