import { useState } from "react";
import { liButton } from "../line-investigation/parts/button-class";

export function GoToLine({ max, onGo }: { max: number; onGo: (line: number) => void }) {
  const [value, setValue] = useState("");

  function submit() {
    const n = Number.parseInt(value, 10);
    if (Number.isNaN(n)) return;
    onGo(Math.min(Math.max(n, 1), max));
    setValue("");
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="line"
        aria-label={`Go to line, 1 to ${max}`}
        className="h-6 w-16 border border-li-neutral-500 bg-li-paper px-2 font-li-mono text-[11px] text-li-ink outline-none placeholder:text-li-text-muted focus:border-li-ink focus:shadow-[inset_0_0_0_1px_var(--color-li-ink)]"
      />
      <button
        type="button"
        onClick={submit}
        className={liButton("secondary", "font-li-mono", "xs")}
      >
        go
      </button>
    </div>
  );
}
