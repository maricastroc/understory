"use client";

import { useState } from "react";
import type { RepoMeta } from "@git-investigator/core/types";
import { ErrorState } from "../ErrorState";
import { Branch, Check, Close, Github, Lock, Repo } from "../icons";
import { authEnabled } from "../investigator/use-auth";
import { BlueprintCorners } from "../line-investigation/parts/BlueprintCorners";
import { liButton } from "../line-investigation/parts/button-class";
import { CHIP, FIELD_LABEL, FIELD_ROW, ICON_BUTTON, SPINNER } from "./composer-classes";

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
  signedIn = false,
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
  signedIn?: boolean;
}) {
  const [showToken, setShowToken] = useState(false);
  const looksPrivate = /404|not found|private/i.test(error ?? "");
  const tokenOpen = showToken || token.trim() !== "" || looksPrivate;

  const openClass = liButton(
    ready ? "secondary" : "primary",
    "h-7 px-2.5 text-[12.5px] disabled:cursor-default disabled:opacity-100",
  );

  return (
    <>
      <div className={FIELD_ROW}>
        <span className={FIELD_LABEL}>Repo</span>
        <input
          aria-label="Repository URL or path"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "repo-error" : undefined}
          value={repoPath}
          onChange={(e) => onEdit(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onOpen()}
          placeholder="https://github.com/owner/repo  ·  owner/repo  ·  ./local/path"
          className="min-w-0 flex-1 truncate bg-transparent font-li-mono text-[13px] text-li-ink outline-none placeholder:font-li-body placeholder:text-li-text-muted"
        />
        {repoPath.trim() !== "" && (
          <button
            type="button"
            aria-label="Clear repository"
            onClick={() => onEdit("")}
            className={ICON_BUTTON}
          >
            <Close className="size-3.5" />
          </button>
        )}
        <button type="button" onClick={onOpen} disabled={connecting || ready} className={openClass}>
          {!ready && <BlueprintCorners />}
          {ready ? <Check className="size-3.5" /> : <Repo className="size-3.5" />}
          {connecting ? "Opening…" : ready ? "Opened" : "Open"}
        </button>
      </div>

      {!ready &&
        !signedIn &&
        (tokenOpen ? (
          <div className={FIELD_ROW}>
            <span className={FIELD_LABEL}>Token</span>
            <Lock className="size-3.5 shrink-0 text-li-text-muted" />
            <input
              type="password"
              aria-label="GitHub personal access token"
              value={token}
              onChange={(e) => onTokenChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onOpen()}
              placeholder="ghp_… — for a private repo, kept in this tab only"
              className="min-w-0 flex-1 bg-transparent font-li-mono text-[13px] text-li-ink outline-none placeholder:font-li-body placeholder:text-li-text-muted"
            />
            {token.trim() !== "" && (
              <button
                type="button"
                aria-label="Clear token"
                onClick={() => onTokenChange("")}
                className={ICON_BUTTON}
              >
                <Close className="size-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-li-divider bg-li-steel-100/70 px-3.5 py-2 text-[12px]">
            <Lock className="size-3.5 shrink-0 text-li-steel-700" />
            <span className="font-semibold text-li-steel-800">Private repo?</span>
            {authEnabled ? (
              <>
                <a
                  href="/api/auth/login"
                  className="inline-flex items-center gap-1 font-semibold text-li-steel-700 underline-offset-2 hover:underline"
                >
                  <Github className="size-3.5" />
                  Sign in with GitHub
                </a>
                <span className="text-li-text-subtle">— no token needed. Or</span>
                <button
                  type="button"
                  onClick={() => setShowToken(true)}
                  className="cursor-pointer font-medium text-li-ink underline-offset-2 hover:underline"
                >
                  add a token
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowToken(true)}
                className="cursor-pointer font-semibold text-li-steel-700 underline-offset-2 hover:underline"
              >
                Add a token
              </button>
            )}
          </div>
        ))}

      {connecting && (
        <div
          role="status"
          className="flex items-center gap-2 border-b border-li-divider bg-li-paper px-3.5 py-2 text-[12.5px] text-li-text-subtle"
        >
          <span aria-hidden className={`size-3.5 ${SPINNER}`} />
          Opening repository… cloning from a URL the first time can take a moment.
        </div>
      )}
      {ready && meta && (
        <div className="flex flex-wrap items-center gap-2 border-b border-li-divider bg-li-paper px-3.5 py-2.5">
          <span className={CHIP}>
            <span aria-hidden className="size-1.5 rounded-full bg-li-evidence" />
            Opened
          </span>
          <span className={CHIP}>{kindLabel[meta.kind]}</span>
          {meta.branch && (
            <span className={CHIP}>
              <Branch className="size-3 text-li-text-muted" />
              {meta.branch}
            </span>
          )}
        </div>
      )}
      {error && (
        <ErrorState id="repo-error" message={error} onRetry={onOpen} signedIn={signedIn} flush />
      )}
    </>
  );
}
