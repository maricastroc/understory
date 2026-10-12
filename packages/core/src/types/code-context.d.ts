export type LineChange = {
  artifactId: string;
  before: string | null;
  added: number;
  block?: { rows: string[]; at: number };
};

export type CodeContext = {
  startLine: number;
  lines: string[];
  change?: LineChange;
};
