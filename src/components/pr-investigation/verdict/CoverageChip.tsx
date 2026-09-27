import { CHIP_BASE } from "../../line-investigation/verdict/VerdictButton";
import type { PrView } from "../model/types";
import { RegionCell } from "../why/RegionCells";

const MAX_SEGMENTS = 24;

export function coverageLabel(view: PrView): string {
  if (view.mode === "evidence-only") return "Evidence only";
  const total = view.regions.length;
  const partly = view.regions.filter((r) => r.state === "partial").length;
  const base = `${view.explained} of ${total} region${total === 1 ? "" : "s"} explained`;
  return partly > 0 ? `${base} · ${partly} partly` : base;
}

export function CoverageChip({
  view,
  open,
  controls,
  onToggle,
}: {
  view: PrView;
  open: boolean;
  controls: string;
  onToggle: () => void;
}) {
  const allSilent =
    view.mode === "synthesized" &&
    view.regions.length > 0 &&
    view.regions.every((r) => r.state === "silent");
  const tone =
    view.mode === "evidence-only" || (!allSilent && view.explained === 0)
      ? "border border-li-ink text-li-ink hover:bg-li-neutral-200"
      : allSilent
        ? "bg-li-gap-tint text-li-gap-ink hover:bg-li-neutral-200"
        : "bg-li-evidence-tint text-li-evidence-ink hover:bg-li-evidence-quote";
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={controls}
      aria-haspopup="dialog"
      onClick={onToggle}
      className={`${CHIP_BASE} ${tone}`}
    >
      {view.mode === "synthesized" && (
        <span aria-hidden className="flex gap-0.5">
          {view.regions.slice(0, MAX_SEGMENTS).map((r) => (
            <RegionCell key={r.id} state={r.state} height={11} />
          ))}
        </span>
      )}
      {coverageLabel(view)}
      <span aria-hidden className="font-normal opacity-80">
        ▾
      </span>
    </button>
  );
}
