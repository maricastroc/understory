"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { ErrorState } from "../ErrorState";
import { authEnabled } from "../investigator/use-auth";
import { BlueprintCorners } from "../line-investigation/parts/BlueprintCorners";
import { liButton } from "../line-investigation/parts/button-class";
import { SPINNER } from "./composer-classes";

const ROW =
  "group grid w-full cursor-pointer grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-3 border-b border-li-divider px-1 py-3.5 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-li-steel";
const ACTION =
  "text-[12.5px] text-li-steel-700 underline-offset-2 transition-colors group-hover:text-li-steel-900 group-hover:underline motion-reduce:transition-none";

export function RepoStage({
  repoPath,
  onEdit,
  onOpen,
  connecting,
  error,
  token,
  onTokenChange,
  signedIn,
  demoRepo,
  onOpenDemo,
  autoFocus = false,
}: {
  repoPath: string;
  onEdit: (v: string) => void;
  onOpen: () => void;
  connecting: boolean;
  error: string | null;
  token: string;
  onTokenChange: (v: string) => void;
  signedIn: boolean;
  demoRepo: string | null;
  onOpenDemo: () => void;
  autoFocus?: boolean;
}) {
  const inputId = useId();
  const hintId = useId();
  const [showToken, setShowToken] = useState(false);
  const tokenOpen = !signedIn && (showToken || token.trim() !== "");

  return (
    <section aria-label="Choose a repository" className="flex max-w-170 flex-col gap-7 pt-10">
      <div className="flex flex-col gap-2.5">
        <label htmlFor={inputId} className="text-[13px] font-semibold">
          Repository
        </label>
        <div className="flex items-stretch gap-2">
          <input
            id={inputId}
            autoFocus={autoFocus}
            aria-describedby={hintId}
            aria-invalid={error ? true : undefined}
            value={repoPath}
            onChange={(e) => onEdit(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onOpen()}
            placeholder="github.com/owner/repo or a local path"
            className="h-12 min-w-0 flex-1 border border-li-neutral-500 bg-li-neutral-100 px-3.5 font-li-mono text-[15px] text-li-ink outline-none placeholder:text-li-text-muted focus:border-li-steel focus:shadow-[0_0_0_1px_var(--color-li-steel)]"
          />
          <button
            type="button"
            onClick={onOpen}
            disabled={connecting || !repoPath.trim()}
            className={liButton("primary", "h-12 px-5")}
          >
            <BlueprintCorners />
            {connecting ? "Opening…" : "Open"}
          </button>
        </div>
        <p id={hintId} className="text-xs text-li-neutral-700">
          Public repos open without signing in. Private repos need GitHub sign-in
          {signedIn ? "." : " or a token."}
          {!signedIn && !tokenOpen && (
            <>
              {" "}
              {authEnabled && (
                <a
                  href="/api/auth/login"
                  className="text-li-steel-700 underline underline-offset-2 hover:text-li-steel-900"
                >
                  Sign in with GitHub
                </a>
              )}
              {authEnabled && " · "}
              <button
                type="button"
                onClick={() => setShowToken(true)}
                className="cursor-pointer text-li-steel-700 underline underline-offset-2 hover:text-li-steel-900"
              >
                Use a token
              </button>
            </>
          )}
        </p>
        {tokenOpen && (
          <input
            type="password"
            aria-label="GitHub personal access token"
            value={token}
            onChange={(e) => onTokenChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onOpen()}
            placeholder="ghp_… for a private repo, kept in this tab only"
            className="h-10 border border-li-neutral-500 bg-li-neutral-100 px-3.5 font-li-mono text-[13px] text-li-ink outline-none placeholder:text-li-text-muted focus:border-li-steel"
          />
        )}
        {connecting && (
          <p role="status" className="flex items-center gap-2 text-[12.5px] text-li-text-subtle">
            <span aria-hidden className={`size-3.5 ${SPINNER}`} />
            Opening repository… cloning from a URL the first time can take a moment.
          </p>
        )}
        {error && <ErrorState message={error} onRetry={onOpen} signedIn={signedIn} />}
      </div>

      <div className="flex flex-col border-t border-li-ink">
        {demoRepo && (
          <button type="button" onClick={onOpenDemo} className={ROW}>
            <span aria-hidden className="ml-1.5 size-2 rounded-full bg-li-evidence" />
            <span className="flex flex-col gap-0.5">
              <span className="font-li-mono text-[13px] underline-offset-2 group-hover:underline">
                {demoRepo}
              </span>
              <span className="text-xs text-li-neutral-700">Demo repository</span>
            </span>
            <span className={ACTION}>Open demo →</span>
          </button>
        )}
        <Link href="/pr" className={ROW}>
          <span aria-hidden className="ml-1 flex gap-px">
            <span className="h-2.5 w-0.5 bg-li-ink" />
            <span className="mt-1 h-1.5 w-0.5 bg-li-ink" />
            <span className="h-2.5 w-0.5 bg-li-ink" />
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-[13.5px] text-li-ink underline-offset-2 group-hover:underline">
              Explain a pull request instead
            </span>
            <span className="text-xs text-li-neutral-700">
              Paste a PR URL and every changed region is investigated
            </span>
          </span>
          <span aria-hidden className={ACTION}>
            →
          </span>
        </Link>
      </div>
    </section>
  );
}
