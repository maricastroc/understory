"use client";

import { useLocale, useMessages } from "@/i18n/LocaleProvider";
import { formatSeconds } from "@/i18n/format";
import type { Locale } from "@/i18n/locales";
import type { Messages } from "@/i18n/messages";
import type { ApiFailure } from "@/lib/api-error";
import { Alert, Github } from "./icons";
import { authEnabled } from "./investigator/use-auth";
import { liButton } from "./line-investigation/parts/button-class";

export function failureLead(
  failure: ApiFailure,
  m: Messages,
  locale: Locale,
  title: string,
): string {
  const e = m.errors;
  switch (failure.code) {
    case "not-found":
      return e.notFound;
    case "rate-limited":
      return e.rateLimited(failure.host ?? "GitHub");
    case "busy":
      return failure.retryAfter ? e.busy(formatSeconds(locale, failure.retryAfter)) : e.busySoon;
    case "too-large":
      return e.tooLarge;
    case "ai-unavailable":
      return e.aiUnavailable;
    case "owner-not-repo":
      return e.ownerNotRepo;
    case "not-a-repository":
      return e.notARepository;
    case "git-unavailable":
      return e.gitUnavailable;
    case "server":
      return e.server;
    case "network":
      return e.network;
    case "no-evidence":
      return e.noEvidence;
    case "failed":
      return title;
  }
}

const QUIET = new Set<ApiFailure["code"]>(["network", "busy", "no-evidence"]);

export function failureDetail(failure: ApiFailure): string | null {
  return QUIET.has(failure.code) ? null : failure.detail;
}

export function ErrorState({
  id,
  failure,
  title,
  onRetry,
  signedIn = false,
  flush = false,
}: {
  id?: string;
  failure: ApiFailure;
  title: string;
  onRetry?: () => void;
  signedIn?: boolean;
  flush?: boolean;
}) {
  const m = useMessages();
  const locale = useLocale();
  const access = failure.code === "not-found" || failure.code === "rate-limited";
  const suggestSignIn = authEnabled && !signedIn && access;
  const detail = failureDetail(failure);

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
        <p className="text-[13px]">{failureLead(failure, m, locale, title)}</p>
        {detail && (
          <p lang="en" className="mt-1 font-li-mono text-[11.5px] break-words text-li-text-subtle">
            {detail}
          </p>
        )}
        {failure.installUrl && (
          <p className="mt-1 text-[12.5px] text-li-text-subtle">{m.errors.installHint}</p>
        )}
        {suggestSignIn && (
          <p className="mt-1 text-[12.5px] text-li-text-subtle">{m.errors.signInHint}</p>
        )}
        {(suggestSignIn || failure.installUrl || onRetry) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {suggestSignIn && (
              <a href="/api/auth/login" className={liButton("secondary", "", "sm")}>
                <Github className="size-3.5" />
                {m.common.signInWithGithub}
              </a>
            )}
            {failure.installUrl && (
              <a
                href={failure.installUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={liButton("secondary", "", "sm")}
              >
                <Github className="size-3.5" />
                {m.errors.installApp}
              </a>
            )}
            {onRetry && (
              <button type="button" onClick={onRetry} className={liButton("secondary", "", "sm")}>
                {m.common.tryAgain}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
