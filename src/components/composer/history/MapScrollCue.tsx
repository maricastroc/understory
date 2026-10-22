import { useMessages } from "@/i18n/LocaleProvider";
import { liButton } from "../../line-investigation/parts/button-class";

export function MapScrollCue({
  side,
  count,
  top,
  onPage,
}: {
  side: "before" | "after";
  count: number;
  top: number;
  onPage: () => void;
}) {
  const m = useMessages().map;
  const after = side === "after";
  const files = m.moreFiles(count);
  return (
    <>
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 w-14 from-li-paper to-transparent ${
          after ? "right-0 bg-linear-to-l" : "left-0 bg-linear-to-r"
        }`}
      />
      <button
        type="button"
        onClick={onPage}
        aria-label={after ? m.scrollRight(files) : m.scrollLeft(files)}
        className={liButton(
          "secondary",
          `absolute bg-li-paper font-li-mono ${after ? "right-0" : "left-0"}`,
          "xs",
        )}
        style={{ top: top - 12 }}
      >
        {after ? m.moreAfter(count) : m.moreBefore(count)}
      </button>
    </>
  );
}
