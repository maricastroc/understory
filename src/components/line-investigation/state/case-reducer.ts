import type { CaseAction, CaseState } from "./types";

export function initialCaseState(keyOpen = false): CaseState {
  return {
    pinnedClause: null,
    hoverClause: null,
    hoverArtifact: null,
    inspected: null,
    drawerList: false,
    verdictOpen: false,
    keyOpen,
    codeExpanded: false,
  };
}

export function caseReducer(state: CaseState, action: CaseAction): CaseState {
  switch (action.type) {
    case "hover-clause":
      return state.hoverClause === action.id ? state : { ...state, hoverClause: action.id };
    case "toggle-pin":
      return { ...state, pinnedClause: state.pinnedClause === action.id ? null : action.id };
    case "clear-pin":
      return { ...state, pinnedClause: null };
    case "hover-artifact":
      return state.hoverArtifact === action.id ? state : { ...state, hoverArtifact: action.id };
    case "inspect":
      return { ...state, inspected: action.id, drawerList: false };
    case "open-list":
      return { ...state, inspected: null, drawerList: true };
    case "close-drawer":
      return { ...state, inspected: null, drawerList: false };
    case "step": {
      if (!state.inspected) return state;
      const at = action.order.indexOf(state.inspected);
      if (at < 0) return state;
      const next = Math.min(action.order.length - 1, Math.max(0, at + action.delta));
      return next === at ? state : { ...state, inspected: action.order[next] };
    }
    case "toggle-verdict":
      return { ...state, verdictOpen: !state.verdictOpen };
    case "close-verdict":
      return state.verdictOpen ? { ...state, verdictOpen: false } : state;
    case "toggle-key":
      return { ...state, keyOpen: !state.keyOpen };
    case "toggle-code":
      return { ...state, codeExpanded: !state.codeExpanded };
    case "escape":
      if (state.inspected || state.drawerList)
        return { ...state, inspected: null, drawerList: false };
      if (state.verdictOpen) return { ...state, verdictOpen: false };
      if (state.pinnedClause) return { ...state, pinnedClause: null };
      return state;
  }
}

export function effectiveClause(state: CaseState): string | null {
  return state.hoverClause ?? state.pinnedClause;
}

export function drawerOpen(state: CaseState): boolean {
  return state.inspected !== null || state.drawerList;
}
