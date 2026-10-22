import { useMessages } from "@/i18n/LocaleProvider";
import { HATCH_WIDE } from "../parts/hatch";

export function Legend() {
  const m = useMessages().caseScreen;
  const l = m.legend;
  return (
    <ul
      aria-label={m.key}
      className="ml-1.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[11.5px] text-li-text-subtle"
    >
      <li className="flex items-center gap-1.25">
        <span className="size-2.25 rounded-full border-[1.5px] border-li-ink bg-li-evidence" />
        {l.commit}
      </li>
      <li className="flex items-center gap-1.25">
        <span className="h-3 w-1.5 border border-li-evidence-edge bg-li-evidence-tint" />
        {l.pr}
      </li>
      <li className="flex items-center gap-1.25">
        <span className="h-0.5 w-2.5 bg-li-ink" />
        {l.review}
      </li>
      <li className="flex items-center gap-1.25">
        <span className="size-2 rotate-45 border-[1.5px] border-li-ink bg-li-evidence" />
        {l.issue}
      </li>
      <li className="flex items-center gap-1.25">
        <span
          className="size-2.75 border border-dashed border-li-gap"
          style={{ background: HATCH_WIDE }}
        />
        {l.notRecorded}
      </li>
      <li className="flex items-center gap-1.25">
        <span className="size-2.75 border border-dashed border-li-unverified" />
        {l.notVerified}
      </li>
      <li className="flex items-center gap-1.25">
        <span className="size-2.25 rounded-full bg-li-evidence" />
        {l.cited}
        <span className="size-2.25 rounded-full border-[1.5px] border-li-ink" />
        {l.supporting}
      </li>
      <li>{l.depth}</li>
    </ul>
  );
}
