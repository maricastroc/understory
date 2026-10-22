import { useState } from "react";
import { useMessages } from "@/i18n/LocaleProvider";
import { Legend } from "../legend/Legend";
import { liButton } from "../parts/button-class";

export function Toolbar({
  history,
  keyOpen,
  answer,
  onHistory,
  onToggleKey,
}: {
  history: string | null;
  keyOpen: boolean;
  answer: string | null;
  onHistory: () => void;
  onToggleKey: () => void;
}) {
  const c = useMessages().caseScreen;
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!answer) return;
    try {
      await navigator.clipboard.writeText(answer);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };
  if (!history && !answer) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {history && (
        <>
          <button type="button" onClick={onHistory} className={liButton("secondary", "", "sm")}>
            {history} ↓
          </button>
          <button
            type="button"
            aria-expanded={keyOpen}
            onClick={onToggleKey}
            className={liButton("ghost", "", "sm")}
          >
            {c.key}
          </button>
          {keyOpen && <Legend />}
        </>
      )}
      {answer && (
        <button type="button" onClick={copy} className={liButton("ghost", "ml-auto", "sm")}>
          <span aria-live="polite">{copied ? c.copied : c.copyWhy}</span>
        </button>
      )}
    </div>
  );
}
