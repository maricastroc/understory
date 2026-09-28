"use client";

import { type Dispatch, useEffect } from "react";
import type { CaseAction, CaseState } from "../state/types";

function typing(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

export function useCaseKeyboard(state: CaseState, dispatch: Dispatch<CaseAction>, order: string[]) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        dispatch({ type: "escape" });
        return;
      }
      if (!state.inspected || typing(e.target)) return;
      if ((e.target as HTMLElement | null)?.closest?.("[data-clause]")) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        dispatch({ type: "step", order, delta: e.key === "ArrowDown" ? 1 : -1 });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.inspected, dispatch, order]);
}
