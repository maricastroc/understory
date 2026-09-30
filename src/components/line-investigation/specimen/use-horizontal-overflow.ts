"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

export function useHorizontalOverflow(): [
  (el: HTMLElement | null) => (() => void) | void,
  boolean,
] {
  const [overflowing, setOverflowing] = useState(false);
  const node = useRef<HTMLElement | null>(null);
  const read = useCallback(() => {
    const el = node.current;
    if (el) setOverflowing(el.scrollWidth > el.clientWidth + 1);
  }, []);

  useLayoutEffect(read);

  const ref = useCallback(
    (el: HTMLElement | null) => {
      node.current = el;
      if (!el) return;
      read();
      const observer = new ResizeObserver(read);
      observer.observe(el);
      for (const child of el.children) observer.observe(child);
      return () => observer.disconnect();
    },
    [read],
  );
  return [ref, overflowing];
}
