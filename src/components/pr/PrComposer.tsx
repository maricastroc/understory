"use client";

import { useState } from "react";
import { FIELD_LABEL, FIELD_ROW, ICON_BUTTON, PANEL, SPINNER } from "../composer/composer-classes";
import { ErrorState } from "../ErrorState";
import { Close, Github, Lock, Search } from "../icons";
import { authEnabled } from "../investigator/use-auth";
import { BlueprintCorners } from "../line-investigation/parts/BlueprintCorners";
import { liButton } from "../line-investigation/parts/button-class";

const EXAMPLE = "chalk/chalk#664";

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
    <div className={`overflow-hidden font-li-body text-li-ink ${PANEL}`}>
      <div className="border-b border-li-divider bg-li-paper px-3.5 py-3">
        <h1 className="text-base font-semibold">Explain a pull request</h1>
        <p className="mt-0.5 text-[12.5px] text-li-text-subtle">
          The same investigation as Explain a line, at pull-request scale — the grounded{" "}
          <b className="font-medium text-li-ink">why</b> behind the code it changes, every claim
          linked to the commits, PRs, reviews and issues that explain it.
        </p>
      </div>

      <div className={FIELD_ROW}>
        <span className={FIELD_LABEL}>PR</span>
        <input
          aria-label="GitHub pull request URL"
          aria-invalid={error && !loading ? true : undefined}
          aria-describedby={error && !loading ? "pr-error" : undefined}
          value={pr}
          onChange={(e) => setPr(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onRun()}
          placeholder="https://github.com/owner/repo/pull/123  ·  owner/repo#123"
          className="min-w-0 flex-1 truncate bg-transparent font-li-mono text-[13px] text-li-ink outline-none placeholder:font-li-body placeholder:text-li-text-muted"
          autoComplete="off"
          spellCheck={false}
        />
        {pr.trim() !== "" && (
          <button
            type="button"
            aria-label="Clear pull request"
            onClick={() => setPr("")}
            className={ICON_BUTTON}
          >
            <Close className="size-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={onRun}
          disabled={loading || !pr.trim()}
          className={liButton("primary", "", "sm")}
        >
          <BlueprintCorners />
          <Search className="size-3.5" />
          {loading ? "Reading…" : "Explain"}
        </button>
      </div>

      {!signedIn &&
        (tokenOpen ? (
          <div className={FIELD_ROW}>
            <span className={FIELD_LABEL}>Token</span>
            <Lock className="size-3.5 shrink-0 text-li-text-muted" />
            <input
              type="password"
              aria-label="GitHub personal access token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onRun()}
              placeholder="ghp_… — for a private PR, kept in this tab only"
              className="min-w-0 flex-1 bg-transparent font-li-mono text-[13px] text-li-ink outline-none placeholder:font-li-body placeholder:text-li-text-muted"
              autoComplete="off"
              spellCheck={false}
            />
            {token.trim() !== "" && (
              <button
                type="button"
                aria-label="Clear token"
                onClick={() => setToken("")}
                className={ICON_BUTTON}
              >
                <Close className="size-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-li-divider bg-li-steel-100/70 px-3.5 py-2 text-xs">
            <Lock className="size-3.5 shrink-0 text-li-steel-700" />
            <span className="font-semibold text-li-steel-800">Private PR?</span>
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

      {loading && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 bg-li-paper px-3.5 py-2.5 text-[12.5px]"
        >
          <span aria-hidden className={`size-3.5 ${SPINNER}`} />
          <span className="font-medium text-li-ink">Explaining this pull request…</span>
          <span className="truncate text-li-text-subtle">
            reading the diff, blaming the changed lines, collecting their history, then
            reconstructing and verifying
          </span>
        </div>
      )}
      {error && !loading && (
        <ErrorState id="pr-error" message={error} onRetry={onRun} signedIn={signedIn} flush />
      )}
      {!loading && (
        <button
          type="button"
          onClick={onExample}
          className="flex w-full cursor-pointer items-center gap-1.5 bg-li-paper px-3.5 py-2 text-left text-xs text-li-text-subtle transition-colors hover:bg-li-neutral-200 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-li-focus motion-reduce:transition-none"
        >
          Try an example → <span className="font-li-mono text-li-ink">{EXAMPLE}</span>
        </button>
      )}
    </div>
  );
}
