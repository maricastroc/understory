"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { liButton } from "../line-investigation/parts/button-class";
import { DomainIcon } from "../line-investigation/parts/DomainIcon";
import { FIELD_SMALL, SECTION_LABEL } from "./composer-classes";

export function PrEntry() {
  const router = useRouter();
  const inputId = useId();
  const [value, setValue] = useState("");
  const pr = value.trim();

  return (
    <section aria-labelledby={`${inputId}-title`} className="flex flex-col gap-3">
      <h3 id={`${inputId}-title`} className={SECTION_LABEL}>
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
          className={`${FIELD_SMALL} flex-1`}
        />
        <button type="submit" disabled={!pr} className={liButton("secondary", "", "field")}>
          Explain →
        </button>
      </form>
    </section>
  );
}
