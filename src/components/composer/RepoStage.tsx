"use client";

import { useId } from "react";
import { ErrorState } from "../ErrorState";
import { BlueprintCorners } from "../line-investigation/parts/BlueprintCorners";
import { liButton } from "../line-investigation/parts/button-class";
import { SPINNER } from "./composer-classes";
import { DomainIcon } from "../line-investigation/parts/DomainIcon";
import { PrEntry } from "./PrEntry";
import { RepoShortcuts } from "./RepoShortcuts";
import type { RecentRepo } from "./types/recent-repo";
import { RepoAccess } from "./RepoAccess";

const PRIVATE = /404|not found|\b403\b|private|permission|forbidden/i;

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
  onOpenRecent,
  recent = [],
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
  onOpenRecent: (path: string) => void;
  recent?: RecentRepo[];
  autoFocus?: boolean;
}) {
  const inputId = useId();
  const statusId = useId();
  const needsAccess = !!error && PRIVATE.test(error);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_300px] gap-x-12 gap-y-10 max-[1100px]:grid-cols-1">
      <section aria-label="Open a repository" className="flex max-w-190 flex-col gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onOpen();
          }}
          className="flex items-stretch gap-2 max-[640px]:flex-col"
        >
          <label htmlFor={inputId} className="sr-only">
            Repository
          </label>
          <div className="flex min-w-0 flex-1 items-center border border-li-ink bg-li-neutral-100 focus-within:border-li-steel focus-within:shadow-[0_0_0_1px_var(--color-li-steel)]">
            <span aria-hidden className="pl-4">
              <DomainIcon kind="repository" size={18} />
            </span>
            <input
              id={inputId}
              autoFocus={autoFocus}
              aria-describedby={statusId}
              aria-invalid={error ? true : undefined}
              value={repoPath}
              onChange={(e) => onEdit(e.target.value)}
              disabled={connecting}
              placeholder="github.com/owner/repo or ./path/to/a/clone"
              spellCheck={false}
              autoComplete="off"
              className="h-14 min-w-0 flex-1 bg-transparent px-3 font-li-mono text-[16px] text-li-ink outline-none placeholder:text-li-text-muted disabled:text-li-text-subtle"
            />
          </div>
          <button
            type="submit"
            disabled={connecting || !repoPath.trim()}
            aria-busy={connecting || undefined}
            className={liButton(
              needsAccess ? "secondary" : "primary",
              `h-14 min-w-28 px-6 text-[15px] ${connecting ? "disabled:cursor-progress disabled:opacity-100" : ""}`,
            )}
          >
            {!needsAccess && <BlueprintCorners />}
            {connecting ? (
              <>
                <span aria-hidden className={`size-3.5 ${SPINNER}`} />
                Opening
              </>
            ) : (
              "Open"
            )}
          </button>
        </form>

        <div id={statusId} aria-live="polite" className="min-h-5">
          {connecting && (
            <p className="text-[13px] text-li-neutral-800">
              Reading the repository. A clone from a URL can take a moment the first time.
            </p>
          )}
        </div>

        {needsAccess && (
          <RepoAccess
            signedIn={signedIn}
            token={token}
            onTokenChange={onTokenChange}
            onRetry={onOpen}
          />
        )}
        {error && !needsAccess && (
          <ErrorState message={error} onRetry={onOpen} signedIn={signedIn} />
        )}
        {!connecting && !error && (
          <div className="mt-6">
            <RepoShortcuts
              recent={recent}
              demoRepo={demoRepo}
              onOpen={onOpenRecent}
              onOpenDemo={onOpenDemo}
            />
          </div>
        )}
      </section>

      <aside
        aria-label="Pull request investigation"
        className="border-l border-li-divider pl-8 max-[1100px]:border-t max-[1100px]:border-l-0 max-[1100px]:pt-6 max-[1100px]:pl-0"
      >
        <PrEntry />
      </aside>
    </div>
  );
}
