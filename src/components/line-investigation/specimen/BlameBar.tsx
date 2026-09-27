import { shortAge } from "../format/age";
import type { BlameBarModel, BlameTone } from "./types";

const TONE: Record<BlameTone, string> = {
  neutral: "bg-li-neutral-300",
  "same-commit": "bg-li-datum-weak",
  datum: "bg-li-datum-bar",
};

export function BlameBar({ bar }: { bar: BlameBarModel }) {
  return (
    <span
      title={`${bar.shortSha} · ${shortAge(bar.ageDays)}`}
      data-tone={bar.tone}
      className={`block h-1.5 ${TONE[bar.tone]}`}
      style={{ width: bar.width }}
    />
  );
}
