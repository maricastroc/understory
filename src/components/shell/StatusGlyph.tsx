import type { RailStatus } from "./types";

const HATCH = "repeating-linear-gradient(135deg, var(--color-li-gap) 0 1px, transparent 1px 3px)";

export function StatusGlyph({ status }: { status: RailStatus }) {
  if (status === "pr") {
    return (
      <span aria-hidden className="mt-1 flex gap-px">
        <span className="h-2.25 w-0.5 bg-li-ink" />
        <span className="mt-1 h-1.25 w-0.5 bg-li-ink" />
        <span className="h-2.25 w-0.5 bg-li-ink" />
      </span>
    );
  }
  if (status === "silent") {
    return (
      <span
        aria-hidden
        className="mt-1.25 size-2 border border-dashed border-li-gap"
        style={{ background: HATCH }}
      />
    );
  }
  if (status === "resolved")
    return <span aria-hidden className="mt-1.25 size-2 rounded-full bg-li-evidence" />;
  if (status === "fabrication") return <span aria-hidden className="mt-1.25 size-2 bg-li-ink" />;
  if (status === "pending") {
    return (
      <span
        aria-hidden
        className="mt-1.25 size-2 rounded-full border-[1.5px] border-dashed border-li-steel motion-safe:animate-pulse"
      />
    );
  }
  return (
    <span
      aria-hidden
      className="mt-1.25 size-2 rounded-full border-[1.5px] border-li-neutral-600"
    />
  );
}
