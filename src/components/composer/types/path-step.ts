export type PathStep = {
  key: string;
  label: string;
  value: string | null;
  state: "done" | "current" | "next";
  onPick: (() => void) | null;
};
