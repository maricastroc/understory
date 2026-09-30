import type { CaseAction, CaseState } from "./types";

export function initialCaseState(keyOpen = false): CaseState {
  return {
    pinnedClause: null,
    hoverClause: null,
    hoverArtifact: null,
    source: null,
    opened: null,
    located: null,
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
      return state.pinnedClause === action.id
        ? { ...state, pinnedClause: null, source: null }
        : { ...state, pinnedClause: action.id, source: null };
    case "clear-pin":
      return { ...state, pinnedClause: null, source: null };
    case "trace":
      return { ...state, pinnedClause: action.clause, source: action.source, hoverClause: null };
    case "show-source":
      return { ...state, source: action.id };
    case "step-source": {
      const at = state.source ? action.order.indexOf(state.source) : 0;
      const next = Math.min(action.order.length - 1, Math.max(0, Math.max(0, at) + action.delta));
      return action.order[next] === state.source ? state : { ...state, source: action.order[next] };
    }
    case "hover-artifact":
      return state.hoverArtifact === action.id ? state : { ...state, hoverArtifact: action.id };
    case "open-row":
      return { ...state, opened: state.opened === action.id ? null : action.id };
    case "locate":
      return { ...state, located: action.id, opened: action.id };
    case "settle-locate":
      return state.located ? { ...state, located: null } : state;
    case "toggle-verdict":
      return { ...state, verdictOpen: !state.verdictOpen };
    case "close-verdict":
      return state.verdictOpen ? { ...state, verdictOpen: false } : state;
    case "toggle-key":
      return { ...state, keyOpen: !state.keyOpen };
    case "toggle-code":
      return { ...state, codeExpanded: !state.codeExpanded };
    case "escape":
      if (state.verdictOpen) return { ...state, verdictOpen: false };
      if (state.pinnedClause) return { ...state, pinnedClause: null, source: null };
      if (state.opened) return { ...state, opened: null };
      return state;
  }
}

export function effectiveClause(state: CaseState): string | null {
  return state.hoverClause ?? state.pinnedClause;
}
