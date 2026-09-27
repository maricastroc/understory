export type CaseState = {
  pinnedClause: string | null;
  hoverClause: string | null;
  hoverArtifact: string | null;
  inspected: string | null;
  drawerList: boolean;
  verdictOpen: boolean;
  keyOpen: boolean;
  codeExpanded: boolean;
};
