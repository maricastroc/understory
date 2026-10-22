import { shortAge } from "@/i18n/format";
import { useMessages } from "@/i18n/LocaleProvider";
import type { BlameBarModel, BlameTone } from "./types";

const TONE: Record<BlameTone, string> = {
  neutral: "bg-li-neutral-300",
  "same-commit": "bg-li-datum-weak",
  datum: "bg-li-datum-bar",
};

export function BlameBar({ bar }: { bar: BlameBarModel }) {
  const time = useMessages().time;
  return (
    <span
      title={`${bar.shortSha} · ${shortAge(time, bar.ageDays)}`}
      data-tone={bar.tone}
      className={`block h-1.5 ${TONE[bar.tone]}`}
      style={{ width: bar.width }}
    />
  );
}
