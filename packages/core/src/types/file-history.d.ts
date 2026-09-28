import type { HistoryMark } from "./history-mark";
import type { HistoryStatus } from "./history-status";

export type FileHistory = {
  path: string;
  blobSha: string;
  status: HistoryStatus;
  lineCount: number;
  marks: HistoryMark[];
  cut: boolean;
  error?: string;
};
