export type RootsLabel = {
  id: string;
  kind: "artifact" | "gap";
  x: number;
  top: number;
  height: number;
  width: number | null;
  align: "start" | "end";
  depth: number;
  leader: Array<readonly [number, number]> | null;
};
