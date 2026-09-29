"use client";

import { useCallback, useRef, useState } from "react";
import { MAP } from "./map-geometry";

type Hidden = { scrolls: boolean; before: number; after: number };

const NONE: Hidden = { scrolls: false, before: 0, after: 0 };

export function hiddenSides(
  xs: readonly number[],
  view: { left: number; width: number; scrollWidth: number },
): Hidden {
  if (view.scrollWidth <= view.width + 1) return NONE;
  const edge = MAP.hit / 2;
  return {
    scrolls: true,
    before: xs.filter((x) => x < view.left + edge).length,
    after: xs.filter((x) => x > view.left + view.width - edge).length,
  };
}

export function useSideScroll(xs: readonly number[]) {
  const node = useRef<HTMLElement | null>(null);
  const [hidden, setHidden] = useState<Hidden>(NONE);

  const ref = useCallback(
    (el: HTMLElement | null) => {
      if (!el) return;
      node.current = el;
      const read = () => {
        const next = hiddenSides(xs, {
          left: el.scrollLeft,
          width: el.clientWidth,
          scrollWidth: el.scrollWidth,
        });
        setHidden((prev) =>
          prev.scrolls === next.scrolls && prev.before === next.before && prev.after === next.after
            ? prev
            : next,
        );
      };
      read();
      const observer = new ResizeObserver(read);
      observer.observe(el);
      if (el.firstElementChild) observer.observe(el.firstElementChild);
      el.addEventListener("scroll", read, { passive: true });
      return () => {
        observer.disconnect();
        el.removeEventListener("scroll", read);
        node.current = null;
      };
    },
    [xs],
  );

  const page = useCallback((dir: 1 | -1) => {
    const el = node.current;
    if (!el) return;
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    el.scrollBy({
      left: dir * Math.round(el.clientWidth * 0.8),
      behavior: still ? "auto" : "smooth",
    });
  }, []);

  return [ref, hidden, page] as const;
}
