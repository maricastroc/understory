import { Alert } from "../icons";

export function UncitedClaimsAlert({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <div className="mt-4 flex items-start gap-2 rounded-md border border-crit/25 bg-crit-tint px-3 py-2.5 text-[12.5px] text-crit">
      <Alert className="mt-0.5 size-4 shrink-0" />
      <span>
        {count} sentence{count > 1 ? "s" : ""} in this answer cite no collected source — shown for
        transparency, but not counted toward confidence.
      </span>
    </div>
  );
}
