"use client";

import type { SymbolSpan } from "@understory/core/collect/symbol";
import { useId, useState } from "react";
import { BlueprintCorners } from "../line-investigation/parts/BlueprintCorners";
import { SECTION_RULE } from "./composer-classes";
import { DomainIcon } from "../line-investigation/parts/DomainIcon";
import { liButton } from "../line-investigation/parts/button-class";
import { symbolNoun } from "./symbol-noun";

const SUGGESTIONS = ["Why this value?", "What problem did this fix?", "Why this approach?"];

export function QuestionForm({
  target,
  runLabel,
  question,
  setQuestion,
  onRun,
  wider,
  onRunWider,
}: {
  target: string;
  runLabel: string;
  question: string;
  setQuestion: (v: string) => void;
  onRun: () => void;
  wider: SymbolSpan | null;
  onRunWider: () => void;
}) {
  const id = useId();
  const [asking, setAsking] = useState(question.trim().length > 0);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onRun();
      }}
      className={`flex flex-col gap-3 ${SECTION_RULE}`}
    >
      {asking ? (
        <div className="flex flex-col gap-2">
          <label htmlFor={id} className="flex items-center gap-2 li-eyebrow text-li-ink">
            <DomainIcon kind="question" size={14} />
            Your question about {target}
          </label>
          <textarea
            id={id}
            rows={3}
            autoFocus
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onRun();
              }
            }}
            placeholder="e.g. Why cap the retries at 3?"
            className="resize-none border border-li-ink bg-li-neutral-100 px-3 py-2.5 text-[15px] leading-snug text-li-ink transition-[border-color,box-shadow] duration-150 outline-none placeholder:text-li-text-muted focus:border-li-ink focus:shadow-[inset_0_0_0_1px_var(--color-li-ink)] motion-reduce:transition-none"
          />
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setQuestion(s)}
                className="cursor-pointer border border-li-divider px-2 py-0.5 text-[12.5px] text-li-ink transition-colors hover:bg-li-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-li-focus motion-reduce:transition-none"
              >
                {s}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setQuestion("");
              setAsking(false);
            }}
            className="w-fit li-link text-left text-[12.5px]"
          >
            Use the general question instead
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAsking(true)}
          className="flex w-fit li-link items-center gap-2 text-left text-[13px]"
        >
          <DomainIcon kind="question" size={14} />
          Ask a specific question
          <span className="text-li-text-subtle">(optional)</span>
        </button>
      )}
      <button type="submit" className={liButton("primary", "w-full", "lg")}>
        <BlueprintCorners />
        {runLabel} →
      </button>
      {wider && (
        <button
          type="button"
          onClick={onRunWider}
          className="flex w-full cursor-pointer flex-col items-center gap-0.5 border border-li-divider px-3 py-2 text-center text-sm leading-[1.3] font-medium text-li-ink transition-colors duration-150 hover:bg-li-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-li-focus active:bg-li-neutral-300 motion-reduce:transition-none"
        >
          <span className="max-w-full">
            Investigate the whole {symbolNoun(wider.kind)}
            {wider.name && (
              <>
                {" "}
                <code className="font-li-mono break-all">{wider.name}</code>
              </>
            )}
          </span>{" "}
          <span className="text-[12px] font-normal text-li-text-subtle">
            {wider.end - wider.start + 1} lines
          </span>
        </button>
      )}
    </form>
  );
}
