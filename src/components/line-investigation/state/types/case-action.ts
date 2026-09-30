export type CaseAction =
  | { type: "hover-clause"; id: string | null }
  | { type: "toggle-pin"; id: string }
  | { type: "clear-pin" }
  | { type: "trace"; clause: string; source: string }
  | { type: "show-source"; id: string }
  | { type: "step-source"; order: string[]; delta: 1 | -1 }
  | { type: "hover-artifact"; id: string | null }
  | { type: "open-row"; id: string }
  | { type: "locate"; id: string }
  | { type: "settle-locate" }
  | { type: "toggle-verdict" }
  | { type: "close-verdict" }
  | { type: "toggle-key" }
  | { type: "toggle-code" }
  | { type: "escape" };
