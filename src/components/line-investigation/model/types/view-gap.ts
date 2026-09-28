import type { GapBasis } from "./gap-basis";

export type ViewGap = {
  id: string;
  missing: "pull_request" | "review" | "issue" | "reason";
  afterId: string;
  verified: boolean;
  basis: GapBasis;
};
