export type DepthScale = {
  depth: number;
  offset: (days: number) => number;
  ticks: Array<{ offset: number; label: string }>;
  breakAt: number | null;
};
