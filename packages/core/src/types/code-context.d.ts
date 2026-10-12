export type LineChange = {
  artifactId: string;
  before: string | null;
  added: number;
};

export type CodeContext = {
  startLine: number;
  lines: string[];
  change?: LineChange;
};
