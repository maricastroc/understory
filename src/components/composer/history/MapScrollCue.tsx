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
  const after = side === "after";
  const files = `${count} more ${count === 1 ? "file" : "files"}`;
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
        aria-label={`Scroll ${after ? "right" : "left"}, ${files}`}
        className={liButton(
          "secondary",
          `absolute bg-li-paper font-li-mono ${after ? "right-0" : "left-0"}`,
          "xs",
        )}
        style={{ top: top - 12 }}
      >
        {after ? `${count} more →` : `← ${count} more`}
      </button>
    </>
  );
}
