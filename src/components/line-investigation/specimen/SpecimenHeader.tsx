import { useMessages } from "@/i18n/LocaleProvider";
import { basename } from "../../format";
import type { BlameStatus } from "./types";

export function SpecimenHeader({
  path,
  status,
  hasBars,
}: {
  path: string;
  status: BlameStatus;
  hasBars: boolean;
}) {
  const hint = useMessages().caseScreen.blameHint;
  const shown = status === "ready" && !hasBars ? "unavailable" : status;
  return (
    <div className="flex h-9 shrink-0 items-center gap-2.5 border-b border-li-divider px-3.5">
      <span title={path} className="font-medium text-li-ink">
        {basename(path)}
      </span>
      {hasBars && <span className="text-li-text-muted">blame</span>}
      <span
        className={`ml-auto text-[11px] ${
          shown === "unpinned" ? "text-li-text-subtle" : "text-li-text-muted"
        }`}
      >
        {hint[shown]}
      </span>
    </div>
  );
}
