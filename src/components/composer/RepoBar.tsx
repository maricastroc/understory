"use client";

import { useState } from "react";
import type { RepoMeta } from "@git-investigator/core/types";
import { Alert, Branch, Check, Close, Lock, Repo } from "../icons";

const kindLabel = { github: "GitHub", remote: "Cloned", local: "Local" } as const;

export function RepoBar({
  repoPath,
  onEdit,
  onOpen,
  connecting,
  ready,
  meta,
  error,
  token,
  onTokenChange,
}: {
  repoPath: string;
  onEdit: (v: string) => void;
  onOpen: () => void;
  connecting: boolean;
  ready: boolean;
  meta: RepoMeta | null;
  error: string | null;
  token: string;
  onTokenChange: (v: string) => void;
}) {
  const [showToken, setShowToken] = useState(false);
  const looksPrivate = /404|not found|private/i.test(error ?? "");
  const tokenOpen = showToken || token.trim() !== "" || looksPrivate;

  const openClass = ready
    ? "border border-line-2 bg-inset text-ink-3"
    : "cursor-pointer bg-accent text-white shadow-sm hover:bg-accent-press disabled:opacity-70";

  return (
    <>
      <div className="flex items-center gap-3 border-b border-line px-3.5 py-2.5 transition-colors focus-within:bg-inset/40">
        <span className="w-16 shrink-0 text-[11px] font-semibold tracking-[0.06em] text-ink-3 uppercase">
          Repo
        </span>
        <input
          aria-label="Repository URL or path"
          value={repoPath}
          onChange={(e) => onEdit(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onOpen()}
          placeholder="https://github.com/owner/repo  ·  owner/repo  ·  ./local/path"
          className="min-w-0 flex-1 truncate bg-transparent font-mono text-[13px] text-ink placeholder:font-sans placeholder:text-ink-3"
        />
        {repoPath.trim() !== "" && (
          <button
            type="button"
            aria-label="Clear repository"
            onClick={() => onEdit("")}
            className="grid size-6 shrink-0 cursor-pointer place-items-center rounded-md text-ink-3 transition-colors hover:bg-inset hover:text-ink-2"
          >
            <Close className="size-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={onOpen}
          disabled={connecting || ready}
          className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-medium transition-colors disabled:cursor-default ${openClass}`}
        >
          {ready ? <Check className="size-3.5" /> : <Repo className="size-3.5" />}
          {connecting ? "Opening…" : ready ? "Opened" : "Open"}
        </button>
      </div>

      {tokenOpen ? (
        <div className="flex items-center gap-3 border-b border-line px-3.5 py-2 transition-colors focus-within:bg-inset/40">
          <span className="w-16 shrink-0 text-[11px] font-semibold tracking-[0.06em] text-ink-3 uppercase">
            Token
          </span>
          <Lock className="size-3.5 shrink-0 text-ink-3" />
          <input
            type="password"
            aria-label="GitHub personal access token"
            value={token}
            onChange={(e) => onTokenChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onOpen()}
            placeholder="ghp_… — for a private repo, kept in this tab only"
            className="min-w-0 flex-1 bg-transparent font-mono text-[13px] text-ink placeholder:font-sans placeholder:text-ink-3"
          />
          {token.trim() !== "" && (
            <button
              type="button"
              aria-label="Clear token"
              onClick={() => onTokenChange("")}
              className="grid size-6 shrink-0 cursor-pointer place-items-center rounded-md text-ink-3 transition-colors hover:bg-inset hover:text-ink-2"
            >
              <Close className="size-3.5" />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowToken(true)}
          className="flex w-full cursor-pointer items-center gap-2 border-b border-line bg-accent-tint/30 px-3.5 py-2 text-[12px] font-semibold text-accent-press transition-colors hover:bg-accent-tint/60"
        >
          <Lock className="size-3.5" />
          Private repo? Add a token
        </button>
      )}

      {connecting && (
        <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-3.5 py-2 text-[12.5px] text-ink-2">
          <span className="size-3.5 animate-spin rounded-full border-2 border-line-2 border-t-accent" />
          Opening repository… cloning from a URL the first time can take a moment.
        </div>
      )}
      {ready && meta && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-good-tint/40 px-3.5 py-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-good-tint px-2 py-0.5 text-[11.5px] font-semibold text-good">
            <Check className="size-3.5" />
            Opened
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line-2 bg-surface px-2 py-0.5 text-[11.5px] font-medium text-ink-2">
            <span className="size-1.5 rounded-full bg-good" />
            {kindLabel[meta.kind]}
          </span>
          {meta.branch && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line-2 bg-surface px-2 py-0.5 text-[11.5px] font-medium text-ink-2">
              <Branch className="size-3 text-ink-3" />
              {meta.branch}
            </span>
          )}
          <span className="ml-0.5 min-w-0 truncate font-mono text-[12px] text-ink">
            {meta.name}
          </span>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 border-b border-line bg-crit-tint px-3.5 py-2 text-[12.5px] text-crit">
          <Alert className="mt-0.5 size-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </>
  );
}
