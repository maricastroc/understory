import { HATCH_WIDE } from "../parts/hatch";

export function Legend({ variant = "line" }: { variant?: "line" | "pr" }) {
  return (
    <ul
      aria-label="Key"
      className="ml-1.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[11.5px] text-li-text-subtle"
    >
      <li className="flex items-center gap-1.25">
        <span className="size-2.25 rounded-full border-[1.5px] border-li-ink bg-li-evidence" />
        commit
      </li>
      <li className="flex items-center gap-1.25">
        <span className="h-3 w-1.5 border border-li-evidence-edge bg-li-evidence-tint" />
        PR
      </li>
      {variant === "pr" && (
        <li className="flex items-center gap-1.25">
          <span className="h-2.25 w-5.5 border border-li-evidence-edge bg-li-evidence-tint" />
          one PR across regions
        </li>
      )}
      <li className="flex items-center gap-1.25">
        <span className="h-0.5 w-2.5 bg-li-ink" />
        review
      </li>
      <li className="flex items-center gap-1.25">
        <span className="size-2 rotate-45 border-[1.5px] border-li-ink bg-li-evidence" />
        issue
      </li>
      <li className="flex items-center gap-1.25">
        <span
          className="size-2.75 border border-dashed border-li-gap"
          style={{ background: HATCH_WIDE }}
        />
        not recorded
      </li>
      {variant === "line" && (
        <li className="flex items-center gap-1.25">
          <span className="size-2.75 border border-dashed border-li-unverified" />
          not verified
        </li>
      )}
      <li className="flex items-center gap-1.25">
        <span className="size-2.25 rounded-full bg-li-evidence" />
        cited ·
        <span className="size-2.25 rounded-full border-[1.5px] border-li-ink" />
        supporting
      </li>
      <li>{variant === "pr" ? "depth = time before this PR" : "depth = time before today"}</li>
    </ul>
  );
}
