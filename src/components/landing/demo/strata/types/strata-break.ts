import type { ViewGap } from "../../../../line-investigation/model/types";

export type StrataBreak = {
  kind: "unchanged" | "silent";
  top: number;
  bottom: number;
  days: number;
  gap: ViewGap | null;
};
