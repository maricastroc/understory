import type { SpecimenLayout } from "../../specimen/types";

export type SpecimenSlot = (props: {
  layout: SpecimenLayout;
  expanded: boolean;
  onToggleExpanded: () => void;
  targetDatumY: number;
  onDatumY: (y: number) => void;
}) => React.ReactNode;
