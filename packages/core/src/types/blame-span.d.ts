export type BlameSpan = {
  startLine: number;
  endLine: number;
  sha: string;
  shortSha: string;
  date: string;
  author?: string;
};
