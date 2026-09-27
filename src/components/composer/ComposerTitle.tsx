import { SetupTrail } from "./SetupTrail";
import type { TrailSlot } from "./types/trail-slot";

export function ComposerTitle({ slots }: { slots: TrailSlot[] }) {
  return (
    <div className="flex min-h-10 flex-wrap items-center gap-x-5 gap-y-2">
      <h1 className="text-[32px] leading-[1.1] font-semibold tracking-[-0.02em] whitespace-nowrap">
        New investigation
      </h1>
      <SetupTrail slots={slots} />
    </div>
  );
}
