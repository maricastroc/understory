"use client";

import { useCallback, useId, useMemo, useRef, useState, useTransition } from "react";
import { useLocale, useMessages, useOfferedLocales } from "@/i18n/LocaleProvider";
import { LOCALE_NAME, type Locale } from "@/i18n/locales";
import { setLocale } from "@/i18n/set-locale";
import { Check, Languages } from "../icons";
import { liButton } from "../line-investigation/parts/button-class";
import { useDismiss } from "./use-dismiss";

export function LocaleMenu() {
  const locale = useLocale();
  const offered = useOfferedLocales();
  const m = useMessages();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLUListElement>(null);
  const listId = useId();
  const close = useCallback(() => setOpen(false), []);
  const refs = useMemo(() => [trigger, menu], []);
  useDismiss(open, refs, close);

  if (offered.length < 2) return null;

  const dismiss = () => {
    setOpen(false);
    trigger.current?.focus();
  };

  const choose = (next: Locale) => {
    dismiss();
    if (next !== locale) start(() => setLocale(next));
  };

  return (
    <div className="relative">
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-busy={pending || undefined}
        onClick={() => setOpen((v) => !v)}
        className={liButton("ghost", "max-[640px]:px-1.5")}
      >
        <Languages aria-hidden className="size-4 shrink-0" />
        <span className="sr-only">{`${m.languages.interface}:`}</span>{" "}
        <span lang={locale} className="max-[640px]:sr-only">
          {LOCALE_NAME[locale]}
        </span>
      </button>
      {open && (
        <ul
          ref={menu}
          id={listId}
          aria-label={m.languages.interface}
          onKeyDown={(e) => {
            if (e.key === "Escape") dismiss();
          }}
          className="absolute top-10 right-0 z-40 w-44 border border-li-divider bg-li-paper py-1 shadow-li-lg"
        >
          {offered.map((l) => (
            <li key={l}>
              <button
                type="button"
                lang={l}
                aria-current={l === locale ? "true" : undefined}
                autoFocus={l === locale}
                onClick={() => choose(l)}
                className="flex w-full cursor-pointer items-center justify-between px-3.5 py-2 text-left text-[13px] text-li-ink hover:bg-li-neutral-200 focus-visible:bg-li-neutral-200 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-li-focus aria-[current]:font-semibold"
              >
                {LOCALE_NAME[l]}
                {l === locale && <Check aria-hidden className="size-3.5 shrink-0" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
