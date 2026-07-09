export type Contradiction = {
  artifactId: string;
  by?: string;
  kind: "revert" | "reopened" | "declined";
  detail: string;
};
