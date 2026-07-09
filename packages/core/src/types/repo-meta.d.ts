export type RepoMeta = {
  name: string;
  branch: string | null;
  kind: "local" | "remote" | "github";
  htmlUrl?: string | null;
  private?: boolean;
  description?: string | null;
  language?: string | null;
  stars?: number;
  forks?: number;
  openIssues?: number;
  pushedAt?: string | null;
  topics?: string[];
};
