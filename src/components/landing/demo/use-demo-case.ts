"use client";

import { useCallback, useMemo, useState } from "react";
import { initialCaseState } from "../../line-investigation/state/case-reducer";
import type { CaseAction, CaseState } from "../../line-investigation/state/types";

export function useDemoCase(initial: string): [CaseState, (action: CaseAction) => void] {
  const [active, setActive] = useState(initial);
  const state = useMemo(() => ({ ...initialCaseState(), pinnedClause: active }), [active]);
  const dispatch = useCallback((action: CaseAction) => {
    if (action.type === "toggle-pin") setActive(action.id);
    if (action.type === "hover-clause" && action.id) setActive(action.id);
  }, []);
  return [state, dispatch];
}
