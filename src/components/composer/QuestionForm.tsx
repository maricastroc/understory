"use client";

import type { SymbolSpan } from "@git-investigator/core/collect/symbol";
import { useId } from "react";
import { BlueprintCorners } from "../line-investigation/parts/BlueprintCorners";
import { SECTION_RULE } from "./composer-classes";
import { DomainIcon } from "../line-investigation/parts/DomainIcon";
import { liButton } from "../line-investigation/parts/button-class";
import { symbolNoun } from "./symbol-noun";

export function QuestionForm({
  subject,
  runLabel,
  question,
  setQuestion,
  onRun,
  enclosing,
  canExpand,
  onExpand,
  noCapture,
  setNoCapture,
}: {
  subject: string;
  runLabel: string;
  question: string;
  setQuestion: (v: string) => void;
  onRun: () => void;
  enclosing: SymbolSpan | null;
  canExpand: boolean;
  onExpand: () => void;
  noCapture: boolean;
  setNoCapture: (v: boolean) => void;
}) {
  const id = useId();
  const ready = question.trim().length > 0;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) onRun();
      }}
      className="flex flex-col gap-3"
    >
      <label
        htmlFor={id}
        className={`flex items-center gap-2 li-eyebrow text-li-ink ${SECTION_RULE}`}
      >
        <DomainIcon kind="question" size={14} />
        Your question about this {subject}
      </label>
      <textarea
        id={id}
        rows={3}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (ready) onRun();
          }
        }}
        placeholder={`Why is this ${subject} written this way?`}
        className="resize-none border border-li-ink bg-li-neutral-100 px-3 py-2.5 text-[15px] leading-snug text-li-ink transition-[border-color,box-shadow] duration-150 outline-none placeholder:text-li-text-muted focus:border-li-ink focus:shadow-[inset_0_0_0_1px_var(--color-li-ink)] motion-reduce:transition-none"
      />
      <button type="submit" disabled={!ready} className={liButton("primary", "w-full", "lg")}>
        <BlueprintCorners />
        {runLabel} →
      </button>
      {canExpand && enclosing && (
        <button type="button" onClick={onExpand} className="w-fit li-link text-left text-[12.5px]">
          Widen to the whole {symbolNoun(enclosing.kind)}
          {enclosing.name && (
            <code className="ml-1 font-li-mono font-medium text-li-ink">{enclosing.name}</code>
          )}
          <span className="text-li-text-subtle">
            {" "}
            · {enclosing.end - enclosing.start + 1} lines
          </span>
        </button>
      )}
      <label className="flex w-fit cursor-pointer items-start gap-2 text-[11.5px] leading-snug text-li-text-subtle">
        <input
          type="checkbox"
          checked={noCapture}
          onChange={(e) => setNoCapture(e.target.checked)}
          className="mt-0.5 size-3.5 shrink-0 cursor-pointer accent-li-ink"
        />
        <span>
          Don&apos;t log this question
          <span className="block text-li-text-muted">
            Otherwise it is logged anonymously, with the repo and location, to improve answers.
          </span>
        </span>
      </label>
    </form>
  );
}
