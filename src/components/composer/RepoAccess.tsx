"use client";

import { useState } from "react";
import { authEnabled } from "../investigator/use-auth";
import { liButton } from "../line-investigation/parts/button-class";
import { Github } from "../icons";

export function RepoAccess({
  signedIn,
  token,
  onTokenChange,
  onRetry,
}: {
  signedIn: boolean;
  token: string;
  onTokenChange: (v: string) => void;
  onRetry: () => void;
}) {
  const [showToken, setShowToken] = useState(token.trim() !== "");
  return (
    <div role="alert" className="flex flex-col gap-2.5 border-l-2 border-li-ink pl-4">
      <p className="text-[14px] font-medium text-li-ink">
        {signedIn
          ? "Your GitHub account can't see this repository."
          : "This repository isn't visible without access."}
      </p>
      <p className="text-[13px] text-li-neutral-800">
        {signedIn
          ? "Check the owner and name, or ask for access to it."
          : "It may be private, or the name may be wrong."}
      </p>
      {!signedIn && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {authEnabled && (
            <a href="/api/auth/login" className={liButton("primary", "h-9 px-3.5")}>
              <Github className="size-4" />
              Sign in with GitHub
            </a>
          )}
          {authEnabled && (
            <span className="text-[12.5px] text-li-text-subtle">no token needed, or</span>
          )}
          {!showToken && (
            <button
              type="button"
              onClick={() => setShowToken(true)}
              className="cursor-pointer text-[12.5px] text-li-steel-700 underline underline-offset-2 hover:text-li-steel-900"
            >
              use a personal access token
            </button>
          )}
        </div>
      )}
      {!signedIn && showToken && (
        <div className="flex items-stretch gap-1.5">
          <input
            type="password"
            aria-label="GitHub personal access token"
            value={token}
            onChange={(e) => onTokenChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onRetry()}
            placeholder="ghp_…, kept in this tab only"
            className="h-9 w-80 max-w-full border border-li-neutral-400 bg-transparent px-2.5 font-li-mono text-[12.5px] text-li-ink outline-none placeholder:text-li-text-muted focus:border-li-steel"
          />
          <button
            type="button"
            onClick={onRetry}
            disabled={!token.trim()}
            className={liButton("secondary", "h-9 px-3")}
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
