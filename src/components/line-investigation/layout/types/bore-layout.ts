import type { AxisBreak } from "./axis-break";
import type { DepthTick } from "./depth-tick";
import type { GapPlacement } from "./gap-placement";
import type { GlyphPlacement } from "./glyph-placement";
import type { LabelPlacement } from "./label-placement";
import type { LeaderPath } from "./leader-path";

export type BoreLayout = {
  glyphs: GlyphPlacement[];
  gaps: GapPlacement[];
  labels: LabelPlacement[];
  leaders: LeaderPath[];
  breaks: AxisBreak[];
  ticks: DepthTick[];
  height: number;
};
