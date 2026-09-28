import type { RailStatus } from "./types";
import { HATCH } from "../line-investigation/parts/hatch";

export function StatusGlyph({ status }: { status: RailStatus }) {
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
