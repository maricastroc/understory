export type ChangeScope = { files: number; lines: number; block: number };

export type PlacedComment = {
  body: string;
  path: string;
  diffHunk: string;
  outdated: boolean;
  line?: number | null;
};

export type LineageStop =
  | "the line was added"
  | "depth limit"
  | "time limit"
  | "no patch"
  | "line not located"
  | "quota"
  | "cancelled";

export type LineageEntry = {
  sha: string;
  date: string;
  title: string;
  message?: string;
  did?: "added" | "rewrote" | "respaced";
  before?: string | null;
};

export type Lineage = { entries: LineageEntry[]; stopped: LineageStop };

export type Relation = "this change" | "another change" | "unlinked";

export type Placement = "on the line" | "in its hunk" | "same file, elsewhere" | "another file";

export type Quality = "stated by a cited source" | "insufficient" | "refuted" | "absent";

export type Specificity =
  | "direct: a review comment on the line"
  | "direct: the change is this block alone"
  | "the change that last changed the line"
  | "another change in the line's history"
  | "the file's history"
  | "none";

export type State =
  | "directly linked to the line"
  | "recorded for the change, no specific link shown"
  | "not sustained";

export type ReasonScope = "line" | "change" | "earlier change" | "file";

export type Passage = { source: string; text: string; placement?: Placement; outdated?: boolean };

export type Reason = { claim: number; scope: ReasonScope; sentence?: string; passages: Passage[] };

export type ChangeEntry = {
  id: string;
  date: string;
  title: string;
  message?: string;
  last: boolean;
  shownToTheModels: boolean;
  did?: "added" | "rewrote" | "respaced";
  before?: string | null;
  reasons: Reason[];
};

export type Unsustained = {
  claim: number;
  text: string;
  quality: Exclude<Quality, "stated by a cited source">;
};

export type Reading = {
  history: "the line" | "the file";
  changes: ChangeEntry[];
  earlier: LineageStop | "not read" | null;
  unsustained: Unsustained[];
  claims: Array<{ claim: number; quality: Quality; specificity: Specificity; state: State }>;
};
