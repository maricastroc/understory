import type { ShownReason } from "./shown-reason";

export type ShownFile = {
  path: string;
  blobSha: string | null;
  size: number | null;
  reason: ShownReason;
  churn: number;
};
