import { Alert } from "../icons";

export function FabricationAlert({ ids }: { ids: string[] }) {
  if (ids.length === 0) return null;
  return (
    <div className="mt-4 flex items-start gap-2 rounded-md border border-crit/25 bg-crit-tint px-3 py-2 text-[12.5px] text-crit">
      <Alert className="mt-0.5 size-4 shrink-0" />
      <span>
        {ids.length} fabricated citation{ids.length > 1 ? "s" : ""} caught by verification:{" "}
        <span className="font-mono">{ids.join(", ")}</span> — not in the collected evidence.
      </span>
    </div>
  );
}
