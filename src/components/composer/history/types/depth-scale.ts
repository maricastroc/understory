export type DepthScale = {
  depth: number;
  offset: (days: number) => number;
  ticks: Array<{ offset: number; count: number; unit: "d" | "w" | "m" | "y" }>;
  breakAt: number | null;
};
