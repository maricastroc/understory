import type { BandStub } from "./band-stub";

export type BandMark = {
  id: string;
  cores: string[];
  x1: number;
  x2: number;
  top: number;
  bottom: number;
  cited: boolean;
  stubs: BandStub[];
  connector: { x1: number; x2: number; y: number } | null;
};
