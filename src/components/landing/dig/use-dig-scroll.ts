"use client";

import { type RefObject, useEffect, useState } from "react";
import type { DigProgress } from "./types";

const TIP = 0.8;
const READING = 0.4;
const INTRO_MS = 700;
const NODE = 20;
const BAR = 120;
const GLIDE = 0.24;
const LEAP = 1.5;

type Span = {
  top: number;
  height: number;
  chapter: string | null;
  silent: boolean;
  bore: HTMLElement | null;
  drilled: number;
};
type Mark = { el: HTMLElement; y: number; id: string | null; depth: string | null; item: boolean };

const REST: DigProgress = {
  live: false,
  reached: new Set(),
  chapter: null,
  depth: null,
  silent: false,
  under: false,
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function useDigScroll(root: RefObject<HTMLElement | null>): DigProgress {
  const [progress, setProgress] = useState(REST);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    const soil = el.querySelector<HTMLElement>("[data-dig-soil]");
    const started = performance.now();
    let spans: Span[] = [];
    let marks: Mark[] = [];
    let soilTop = 0;
    let deepest = 0;
    let front = 0;
    let frame = 0;
    let key = "";

    const measure = () => {
      const base = el.getBoundingClientRect().top;
      spans = [...el.querySelectorAll<HTMLElement>("[data-dig-section]")].map((s) => {
        const box = s.getBoundingClientRect();
        return {
          top: box.top - base,
          height: box.height,
          chapter: s.dataset.digChapter ?? null,
          silent: s.dataset.digSection === "silent",
          bore: s.querySelector<HTMLElement>("[data-dig-bore]"),
          drilled: -1,
        };
      });
      marks = [...el.querySelectorAll<HTMLElement>("[data-dig-item], [data-dig-depth]")]
        .map((m) => ({
          el: m,
          y: m.getBoundingClientRect().top - base + Number(m.dataset.digOffset ?? NODE),
          id: m.dataset.digId ?? null,
          depth: m.dataset.digDepth ?? null,
          item: m.hasAttribute("data-dig-item"),
        }))
        .sort((a, b) => a.y - b.y);
      if (soil?.parentElement) soilTop = soil.parentElement.getBoundingClientRect().top - base;
    };

    const paint = () => {
      frame = 0;
      const box = el.getBoundingClientRect();
      const tip = clamp(window.innerHeight * TIP - box.top, 0, box.height);
      const reading = clamp(window.innerHeight * READING - box.top, 0, box.height);
      const intro = still.matches ? 1 : Math.min(1, (performance.now() - started) / INTRO_MS);
      deepest = still.matches ? box.height : Math.max(deepest, tip * (1 - (1 - intro) ** 3));
      const ahead = deepest - front;
      const settled = still.matches || Math.abs(ahead) < 0.5 || ahead > window.innerHeight * LEAP;
      front = settled ? deepest : front + ahead * GLIDE;

      for (const s of spans) {
        const drilled = Math.round(clamp(front - s.top, 0, s.height));
        if (drilled === s.drilled || !s.bore) continue;
        s.drilled = drilled;
        s.bore.style.clipPath = `inset(0 0 ${s.height - drilled}px 0)`;
      }
      if (soil) {
        soil.style.translate = `0 ${Math.round(Math.max(0, front - soilTop))}px`;
        soil.style.visibility = still.matches ? "hidden" : "visible";
      }

      const reached: string[] = [];
      let depth: string | null = null;
      for (const m of marks) {
        const on = front >= m.y;
        if (m.item) {
          const value = on ? "true" : "false";
          if (m.el.dataset.reached !== value) m.el.dataset.reached = value;
        }
        if (on && m.id) reached.push(m.id);
        if (m.depth && tip >= m.y) depth = m.depth;
      }

      const here = spans.findLast((s) => reading >= s.top) ?? spans[0] ?? null;
      const probe = spans.findLast((s) => tip >= s.top) ?? null;
      const under = box.top < 0 && box.bottom > BAR;
      const chapter =
        reading >= box.height ? (el.dataset.digAfter ?? null) : (here?.chapter ?? null);
      const silent = probe?.silent ?? false;
      const next = `${reached.join()}|${chapter}|${depth}|${silent}|${under}`;
      if (next !== key) {
        key = next;
        setProgress({ live: true, reached: new Set(reached), chapter, depth, silent, under });
      }
      if (intro < 1 || !settled) schedule();
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const remeasure = () => {
      measure();
      schedule();
    };

    measure();
    paint();
    const observer = new ResizeObserver(remeasure);
    observer.observe(el);
    void document.fonts?.ready.then(remeasure);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", remeasure);
    still.addEventListener("change", schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", remeasure);
      still.removeEventListener("change", schedule);
    };
  }, [root]);

  return progress;
}
