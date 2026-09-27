"use client";

import { type Dispatch, useEffect } from "react";
import type { CaseAction, CaseState } from "../state/types";

function typing(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

export function useCaseKeyboard(
  state: CaseState,
  dispatch: Dispatch<CaseAction>,
  order: string[],
  regions?: { order: string[]; tooltip: boolean },
) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        dispatch({ type: "escape", tooltip: regions?.tooltip });
        return;
      }
      const drawer = state.inspected !== null || state.drawerList;
      if (
        regions &&
        !drawer &&
        state.selectedRegion &&
        !typing(e.target) &&
        (e.key === "ArrowLeft" || e.key === "ArrowRight")
      ) {
        e.preventDefault();
        dispatch({
          type: "move-region",
          order: regions.order,
          delta: e.key === "ArrowRight" ? 1 : -1,
        });
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
  }, [state.inspected, state.drawerList, state.selectedRegion, dispatch, order, regions]);
}
