import { useCallback, useEffect, useRef, useState } from "react";

const INITIAL_ROWS = 60;

export function useVirtualRows(count: number, rowHeight: number, overscan = 12) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [range, setRange] = useState(() => ({ start: 0, end: Math.min(count, INITIAL_ROWS) }));
  const last = useRef(range);

  const measure = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const first = Math.floor(el.scrollTop / rowHeight);
    const visible = Math.ceil(el.clientHeight / rowHeight);
    const next = {
      start: Math.max(0, first - overscan),
      end: Math.min(count, first + visible + overscan),
    };
    if (next.start === last.current.start && next.end === last.current.end) return;
    last.current = next;
    setRange(next);
  }, [count, rowHeight, overscan]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = 0;
    last.current = { start: 0, end: Math.min(count, INITIAL_ROWS) };
    setRange(last.current);
    measure();
  }, [count, measure]);

  const scrollToIndex = useCallback(
    (index: number) => {
      const el = scrollRef.current;
      if (!el) return;
      el.scrollTop = Math.max(0, index * rowHeight - el.clientHeight / 3);
      measure();
    },
    [rowHeight, measure],
  );

  return {
    scrollRef,
    startIndex: range.start,
    endIndex: range.end,
    totalHeight: count * rowHeight,
    onScroll: measure,
    scrollToIndex,
  };
}
