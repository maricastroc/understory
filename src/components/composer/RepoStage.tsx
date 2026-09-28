"use client";

import { useId } from "react";
import { ErrorState } from "../ErrorState";
import { BlueprintCorners } from "../line-investigation/parts/BlueprintCorners";
import { liButton } from "../line-investigation/parts/button-class";
import { FIELD_FRAME, SPINNER } from "./composer-classes";
import { DomainIcon } from "../line-investigation/parts/DomainIcon";
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
        <div className={`flex h-14 min-w-0 flex-1 items-center ${FIELD_FRAME}`}>
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
            className="h-full min-w-0 flex-1 bg-transparent px-3 font-li-mono text-[16px] text-li-ink outline-none placeholder:text-li-text-muted disabled:text-li-text-subtle"
          />
        </div>
        <button
          type="submit"
          disabled={connecting || !repoPath.trim()}
          aria-busy={connecting || undefined}
          className={liButton(
            needsAccess ? "secondary" : "primary",
            `min-w-28 ${connecting ? "disabled:cursor-progress disabled:opacity-100" : ""}`,
            "xl",
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
      {error && !needsAccess && <ErrorState message={error} onRetry={onOpen} signedIn={signedIn} />}
      {!connecting && !error && (
        <div className="mt-8">
          <RepoShortcuts
            recent={recent}
            demoRepo={demoRepo}
            onOpen={onOpenRecent}
            onOpenDemo={onOpenDemo}
          />
        </div>
      )}
    </section>
  );
}
