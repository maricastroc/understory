import { useState } from "react";
import { Legend } from "../legend/Legend";
import { liButton } from "../parts/button-class";

export function Toolbar({
  count,
  keyOpen,
  answer,
  onOpenList,
  onToggleKey,
  legend = "line",
}: {
  count: number;
  keyOpen: boolean;
  answer: string | null;
  onOpenList: () => void;
  onToggleKey: () => void;
  legend?: "line" | "pr";
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
          <button
            type="button"
            onClick={onOpenList}
            className={liButton("secondary", "px-2.5 py-1 text-[12.5px]")}
          >
            All evidence · {count}
          </button>
          <button
            type="button"
            aria-expanded={keyOpen}
            onClick={onToggleKey}
            className={liButton("ghost", "text-[12.5px]")}
          >
            Key
          </button>
          {keyOpen && <Legend variant={legend} />}
        </>
      )}
      {answer && (
        <button type="button" onClick={copy} className={liButton("ghost", "ml-auto text-[12.5px]")}>
          <span aria-live="polite">{copied ? "Copied" : "Copy the why"}</span>
        </button>
      )}
    </div>
  );
}
