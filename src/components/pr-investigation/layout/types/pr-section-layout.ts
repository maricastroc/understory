import type { AxisLabel } from "./axis-label";
import type { BandMark } from "./band-mark";
import type { CommitMark } from "./commit-mark";
import type { CoreLayout } from "./core-layout";
import type { HatchMark } from "./hatch-mark";
import type { HitTarget } from "./hit-target";
import type { IssueMark } from "./issue-mark";
import type { LetterMark } from "./letter-mark";
import type { PrMark } from "./pr-mark";
import type { TickMark } from "./tick-mark";

export type PrSectionLayout = {
  datumY: number;
  axisX: number;
  axisBottom: number;
  step: number;
  cores: CoreLayout[];
  commits: CommitMark[];
  prs: PrMark[];
  bands: BandMark[];
  reviews: TickMark[];
  issues: IssueMark[];
  hatches: HatchMark[];
  labels: AxisLabel[];
  breaks: number[];
  letters: LetterMark[];
  targets: HitTarget[];
  bottom: number;
};
