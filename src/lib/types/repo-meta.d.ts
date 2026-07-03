export type RepoMeta = {
  name: string;
  branch: string | null;
  kind: "local" | "remote" | "github";
};
