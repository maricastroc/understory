export type CaseAction =
  | { type: "hover-clause"; id: string | null }
  | { type: "toggle-pin"; id: string }
  | { type: "clear-pin" }
  | { type: "hover-artifact"; id: string | null }
  | { type: "inspect"; id: string }
  | { type: "open-list" }
  | { type: "close-drawer" }
  | { type: "step"; order: string[]; delta: 1 | -1 }
  | { type: "toggle-verdict" }
  | { type: "close-verdict" }
  | { type: "toggle-key" }
  | { type: "toggle-code" }
  | { type: "escape" };
