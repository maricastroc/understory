import { useState } from "react";
import { Legend } from "../legend/Legend";
import { liButton } from "../parts/button-class";

export function Toolbar({
  count,
  keyOpen,
  answer,
  onOpenList,
  onToggleKey,
}: {
  count: number;
  keyOpen: boolean;
  answer: string | null;
  onOpenList: () => void;
  onToggleKey: () => void;
}) {
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
  if (count === 0 && !answer) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {count > 0 && (
        <>
          <button type="button" onClick={onOpenList} className={liButton("secondary", "", "sm")}>
            All evidence · {count}
          </button>
          <button
            type="button"
            aria-expanded={keyOpen}
            onClick={onToggleKey}
            className={liButton("ghost", "", "sm")}
          >
            Key
          </button>
          {keyOpen && <Legend />}
        </>
      )}
      {answer && (
        <button type="button" onClick={copy} className={liButton("ghost", "ml-auto", "sm")}>
          <span aria-live="polite">{copied ? "Copied" : "Copy the why"}</span>
        </button>
      )}
    </div>
  );
}
