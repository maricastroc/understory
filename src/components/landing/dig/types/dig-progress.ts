export type DigProgress = {
  live: boolean;
  reached: ReadonlySet<string>;
  chapter: string | null;
  depth: string | null;
  silent: boolean;
  under: boolean;
};
