"use client";

import { useState } from "react";
import { Button } from "../Button";
import { ErrorState } from "../ErrorState";
import { Close, Github, Lock, Search } from "../icons";
import { authEnabled } from "../investigator/use-auth";

const EXAMPLE = "chalk/chalk#664";
const LABEL = "w-16 shrink-0 text-[11px] font-semibold tracking-[0.06em] text-ink-3 uppercase";

export function PrComposer({
  pr,
  setPr,
  token,
  setToken,
  loading,
  error,
  onRun,
  onExample,
  signedIn = false,
}: {
  pr: string;
  setPr: (v: string) => void;
  token: string;
  setToken: (v: string) => void;
  loading: boolean;
  error: string | null;
  onRun: () => void;
  onExample: () => void;
  signedIn?: boolean;
}) {
  const [showToken, setShowToken] = useState(false);
  const looksPrivate = /404|not found|private/i.test(error ?? "");
  const tokenOpen = showToken || token.trim() !== "" || looksPrivate;

  return (
    <div className="overflow-hidden rounded-[10px] border border-line bg-surface shadow-panel">
      <div className="border-b border-line px-3.5 py-3">
        <h1 className="text-[15px] font-semibold tracking-tight">Explain a pull request</h1>
        <p className="mt-0.5 text-[12.5px] text-ink-2">
          The same investigation as Explain a line, at pull-request scale — the grounded{" "}
          <b className="font-medium text-ink">why</b> behind the code it changes, every claim linked
          to the commits, PRs, reviews and issues that explain it.
        </p>
      </div>

      <div className="flex items-center gap-3 border-b border-line px-3.5 py-2.5 transition-colors focus-within:bg-inset/40">
        <span className={LABEL}>PR</span>
        <input
          aria-label="GitHub pull request URL"
          aria-invalid={error && !loading ? true : undefined}
          aria-describedby={error && !loading ? "pr-error" : undefined}
          value={pr}
          onChange={(e) => setPr(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onRun()}
          placeholder="https://github.com/owner/repo/pull/123  ·  owner/repo#123"
          className="min-w-0 flex-1 truncate bg-transparent font-mono text-[13px] text-ink placeholder:font-sans placeholder:text-ink-3"
          autoComplete="off"
          spellCheck={false}
        />
        {pr.trim() !== "" && (
          <button
            type="button"
            aria-label="Clear pull request"
            onClick={() => setPr("")}
            className="grid size-6 shrink-0 cursor-pointer place-items-center rounded-md text-ink-3 transition-colors hover:bg-inset hover:text-ink-2"
          >
            <Close className="size-3.5" />
          </button>
        )}
        <Button type="button" size="xs" onClick={onRun} disabled={loading || !pr.trim()}>
          <Search className="size-3.5" />
          {loading ? "Reading…" : "Explain"}
        </Button>
      </div>

      {!signedIn &&
        (tokenOpen ? (
          <div className="flex items-center gap-3 border-b border-line px-3.5 py-2 transition-colors focus-within:bg-inset/40">
            <span className={LABEL}>Token</span>
            <Lock className="size-3.5 shrink-0 text-ink-3" />
            <input
              type="password"
              aria-label="GitHub personal access token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onRun()}
              placeholder="ghp_… — for a private PR, kept in this tab only"
              className="min-w-0 flex-1 bg-transparent font-mono text-[13px] text-ink placeholder:font-sans placeholder:text-ink-3"
              autoComplete="off"
              spellCheck={false}
            />
            {token.trim() !== "" && (
              <button
                type="button"
                aria-label="Clear token"
                onClick={() => setToken("")}
                className="grid size-6 shrink-0 cursor-pointer place-items-center rounded-md text-ink-3 transition-colors hover:bg-inset hover:text-ink-2"
              >
                <Close className="size-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-line bg-accent-tint/30 px-3.5 py-2 text-[12px]">
            <Lock className="size-3.5 shrink-0 text-accent-press" />
            <span className="font-semibold text-accent-press">Private PR?</span>
            {authEnabled ? (
              <>
                <a
                  href="/api/auth/login"
                  className="inline-flex items-center gap-1 font-semibold text-accent-press underline-offset-2 hover:underline"
                >
                  <Github className="size-3.5" />
                  Sign in with GitHub
                </a>
                <span className="text-ink-3">— no token needed. Or</span>
                <button
                  type="button"
                  onClick={() => setShowToken(true)}
                  className="cursor-pointer font-medium text-ink-2 underline-offset-2 hover:text-ink hover:underline"
                >
                  add a token
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowToken(true)}
                className="cursor-pointer font-semibold text-accent-press underline-offset-2 hover:underline"
              >
                Add a token
              </button>
            )}
          </div>
        ))}

      {loading && (
        <div
          role="status"
          className="flex items-center gap-2 bg-surface-2 px-3.5 py-2 text-[12.5px] text-ink-2"
        >
          <span className="size-3.5 animate-spin rounded-full border-2 border-line-2 border-t-accent" />
          Reading the diff and reconstructing the history behind each change…
        </div>
      )}
      {error && !loading && (
        <ErrorState id="pr-error" message={error} onRetry={onRun} signedIn={signedIn} flush />
      )}
      {!loading && (
        <button
          type="button"
          onClick={onExample}
          className="flex w-full cursor-pointer items-center gap-1.5 px-3.5 py-2 text-left text-[12px] text-ink-2 transition-colors hover:bg-inset/50"
        >
          Try an example → <span className="font-mono text-ink-3">{EXAMPLE}</span>
        </button>
      )}
    </div>
  );
}
