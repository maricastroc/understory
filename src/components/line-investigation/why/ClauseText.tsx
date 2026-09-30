import { useEffect, useLayoutEffect, useRef, useState } from "react";

const LINES = 3;
const REVEAL_MS = 200;

export function ClauseText({ text, open, ink }: { text: string; open: boolean; ink: string }) {
  const inner = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState<{ full: number; clamp: number } | null>(null);
  const [settled, setSettled] = useState(!open);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSettled(false);
  }
  const clamped = !open && settled;

  useEffect(() => {
    if (open) return;
    const t = window.setTimeout(() => setSettled(true), REVEAL_MS);
    return () => window.clearTimeout(t);
  }, [open]);

  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    const read = () => {
      const line = Number.parseFloat(getComputedStyle(el).lineHeight) || 24;
      const full = el.scrollHeight;
      const clamp = Math.min(full, Math.round(line * LINES));
      setSize((s) => (s && s.full === full && s.clamp === clamp ? s : { full, clamp }));
    };
    read();
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text]);

  return (
    <span
      className="pointer-events-none block overflow-hidden text-[17px] leading-[1.42] transition-[max-height] duration-200 ease-out motion-reduce:transition-none"
      style={{ maxHeight: size ? (open ? size.full : size.clamp) : `${LINES}lh` }}
    >
      <span ref={inner} className={`${ink} ${clamped ? "line-clamp-3" : "block"}`}>
        {text}
      </span>
    </span>
  );
}
