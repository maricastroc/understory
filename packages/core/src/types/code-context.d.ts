import type { ChangeScope } from "./reading";

export type LineChange = {
  artifactId: string;
  before: string | null;
  added: number;
  scope?: ChangeScope;
};

export type CodeContext = {
  startLine: number;
  lines: string[];
  change?: LineChange;
};
