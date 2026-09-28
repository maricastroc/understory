"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { liButton } from "../line-investigation/parts/button-class";
import { DomainIcon } from "../line-investigation/parts/DomainIcon";

export function PrEntry() {
  const router = useRouter();
  const inputId = useId();
  const [value, setValue] = useState("");
  const pr = value.trim();

  return (
    <section aria-labelledby={`${inputId}-title`} className="flex flex-col gap-2.5">
      <h3
        id={`${inputId}-title`}
        className="flex items-center gap-2 border-b-2 border-li-ink pb-2 font-li-mono text-[11px] tracking-[0.08em] text-li-ink uppercase"
      >
        <DomainIcon kind="pull_request" size={14} />
        Or a pull request
      </h3>
      <p className="text-[13px] leading-normal text-li-neutral-800">
        Paste it instead. Every region it changes is traced at once.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (pr) router.push(`/pr?pr=${encodeURIComponent(pr)}`);
        }}
        className="flex items-stretch gap-1.5"
      >
        <label htmlFor={inputId} className="sr-only">
          Pull request URL or owner/repo#number
        </label>
        <input
          id={inputId}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="owner/repo#123"
          className="h-9 min-w-0 flex-1 border border-li-neutral-400 bg-transparent px-2.5 font-li-mono text-[12.5px] text-li-ink outline-none placeholder:text-li-text-muted focus:border-li-steel"
        />
        <button
          type="submit"
          disabled={!pr}
          className={liButton("secondary", "h-9 px-3 text-[13px]")}
        >
          Explain →
        </button>
      </form>
    </section>
  );
}
