"use client";

import { useState } from "react";
import { useMessages } from "@/i18n/LocaleProvider";
import { authEnabled } from "../investigator/use-auth";
import { liButton } from "../line-investigation/parts/button-class";
import { Github } from "../icons";
import { FIELD_SMALL } from "./composer-classes";

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
  const m = useMessages();
  const r = m.composer.repo;
  const [showToken, setShowToken] = useState(token.trim() !== "");
  return (
    <div role="alert" className="flex flex-col gap-2.5 border-l-2 border-li-ink pl-4">
      <p className="text-[14px] font-medium text-li-ink">
        {signedIn ? r.noAccessSignedIn : r.noAccess}
      </p>
      <p className="text-[13px] text-li-neutral-800">
        {signedIn ? r.checkSignedIn : r.mayBePrivate}
      </p>
      {!signedIn && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {authEnabled && (
            <a href="/api/auth/login" className={liButton("primary", "", "field")}>
              <Github className="size-4" />
              {m.common.signInWithGithub}
            </a>
          )}
          {authEnabled && (
            <span className="text-[12.5px] text-li-text-subtle">{r.noTokenNeeded}</span>
          )}
          {!showToken && (
            <button
              type="button"
              onClick={() => setShowToken(true)}
              className="li-link text-[12.5px]"
            >
              {r.useToken}
            </button>
          )}
        </div>
      )}
      {!signedIn && showToken && (
        <div className="flex items-stretch gap-1.5">
          <input
            type="password"
            aria-label={r.tokenLabel}
            value={token}
            onChange={(e) => onTokenChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onRetry()}
            placeholder={r.tokenPlaceholder}
            className={`${FIELD_SMALL} w-80 max-w-full`}
          />
          <button
            type="button"
            onClick={onRetry}
            disabled={!token.trim()}
            className={liButton("secondary", "", "field")}
          >
            {r.retry}
          </button>
        </div>
      )}
    </div>
  );
}
