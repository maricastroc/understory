"use client";

import { type Dispatch, useEffect } from "react";
import type { CaseAction } from "../state/types";

export function useCaseKeyboard(dispatch: Dispatch<CaseAction>) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dispatch({ type: "escape" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch]);
}
