import { useState } from "react";

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
        className="h-6 w-16 rounded border border-line-2 bg-surface px-2 font-mono text-[11px] text-ink placeholder:text-ink-3 focus:border-accent/50 focus:ring-2 focus:ring-accent/15 focus:outline-none"
      />
      <button
        type="button"
        onClick={submit}
        className="h-6 cursor-pointer rounded border border-line-2 bg-surface px-2 font-mono text-[11px] text-ink-2 transition-colors hover:bg-inset"
      >
        go
      </button>
    </div>
  );
}
