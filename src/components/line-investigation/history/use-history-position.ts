"use client";

import { type RefObject, useEffect, useState } from "react";

export function useHistoryPosition(
  section: RefObject<HTMLElement | null>,
  bar: RefObject<HTMLElement | null>,
): { inside: boolean; at: string | null } {
  const [position, setPosition] = useState<{ inside: boolean; at: string | null }>({
    inside: false,
    at: null,
  });

  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      const root = section.current;
      const box = bar.current?.getBoundingClientRect();
      if (!root || !box) return;
      const inside = root.getBoundingClientRect().top < window.innerHeight / 2;
      const probe = (box.bottom + window.innerHeight) / 2;
      let at: string | null = null;
      for (const el of root.querySelectorAll<HTMLElement>("[data-stratum]")) {
        if (el.getBoundingClientRect().top <= probe) at = el.dataset.stratum ?? null;
        else break;
      }
      setPosition((p) => (p.inside === inside && p.at === at ? p : { inside, at }));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [section, bar]);

  return position;
}
