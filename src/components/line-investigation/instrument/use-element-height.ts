"use client";

import { useCallback, useState } from "react";

export function useElementHeight(): [(el: HTMLElement | null) => (() => void) | void, number] {
  const [height, setHeight] = useState(0);
  const ref = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    const read = () => setHeight(Math.round(el.getBoundingClientRect().height));
    read();
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, height];
}
