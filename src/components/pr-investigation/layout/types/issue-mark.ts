export type IssueMark = {
  id: string;
  x: number;
  y: number;
  cited: boolean;
  stem: { y1: number; y2: number } | null;
};
