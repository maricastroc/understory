"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "./icons";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard unavailable (e.g. insecure context) — fail silently
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Copied to clipboard" : label}
      className="inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-line-2 bg-surface px-2.5 text-[12px] font-medium text-ink-2 transition-colors hover:bg-inset hover:text-ink"
    >
      {copied ? <Check className="size-3.5 text-good" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : label}
    </button>
  );
}
