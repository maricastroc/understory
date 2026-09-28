import type { TallyState } from "./tally-state";

export type TallyCell = { citation: string; letter: string | null; state: TallyState };
