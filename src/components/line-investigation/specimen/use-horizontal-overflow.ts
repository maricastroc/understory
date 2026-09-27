"use client";

import { useCallback, useState } from "react";

export function useHorizontalOverflow(): [
  (el: HTMLElement | null) => (() => void) | void,
  boolean,
] {
  const [overflowing, setOverflowing] = useState(false);
  const ref = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    const read = () => setOverflowing(el.scrollWidth > el.clientWidth + 1);
    read();
    const observer = new ResizeObserver(read);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => observer.disconnect();
  }, []);
  return [ref, overflowing];
}
