export type CaseState = {
  pinnedClause: string | null;
  hoverClause: string | null;
  hoverArtifact: string | null;
  source: string | null;
  opened: string | null;
  located: string | null;
  verdictOpen: boolean;
  keyOpen: boolean;
  codeExpanded: boolean;
};
