import type { BlameTone } from "./blame-tone";

export type BlameBarModel = {
  line: number;
  sha: string;
  shortSha: string;
  author: string | null;
  ageDays: number;
  width: number;
  tone: BlameTone;
};
