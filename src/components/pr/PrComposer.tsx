"use client";

import { useState } from "react";
import { Alert, Close, Lock, Search } from "../icons";

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
}: {
  pr: string;
  setPr: (v: string) => void;
  token: string;
  setToken: (v: string) => void;
  loading: boolean;
  error: string | null;
  onRun: () => void;
  onExample: () => void;
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
        <button
          type="button"
          onClick={onRun}
          disabled={loading || !pr.trim()}
          className="inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-md bg-accent px-2.5 text-[12.5px] font-medium text-white shadow-sm transition-colors hover:bg-accent-press disabled:cursor-default disabled:opacity-70"
        >
          <Search className="size-3.5" />
          {loading ? "Reading…" : "Explain"}
        </button>
      </div>

      {tokenOpen ? (
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
        <button
          type="button"
          onClick={() => setShowToken(true)}
          className="flex w-full cursor-pointer items-center gap-2 border-b border-line bg-accent-tint/30 px-3.5 py-2 text-[12px] font-semibold text-accent-press transition-colors hover:bg-accent-tint/60"
        >
          <Lock className="size-3.5" />
          Private PR? Add a token
        </button>
      )}

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
        <div
          id="pr-error"
          role="alert"
          className="flex items-start gap-2 border-b border-line bg-crit-tint px-3.5 py-2 text-[12.5px] text-crit"
        >
          <Alert className="mt-0.5 size-3.5 shrink-0" />
          <span>{error}</span>
        </div>
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
