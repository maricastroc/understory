import type { LetterVariant } from "./letter-variant";

const VARIANT: Record<LetterVariant, string> = {
  cited: "border-li-ink bg-li-ink text-li-paper",
  supporting: "border-li-ink text-li-ink",
  gap: "border-dashed border-li-gap text-li-gap-ink",
  unverified: "border-dashed border-li-text-muted text-li-text-muted",
  dimmed: "border-li-text-muted text-li-text-muted",
};

export function EvidenceLetter({
  letter,
  variant,
  size = "md",
}: {
  letter: string;
  variant: LetterVariant;
  size?: "sm" | "md";
}) {
  return (
    <span
      aria-hidden
      className={`inline-block border text-center font-li-mono leading-3.5 ${VARIANT[variant]} ${
        size === "sm" ? "min-w-4 px-1 text-[10.5px]" : "h-4 min-w-5 px-0.5 text-[10px]"
      }`}
    >
      {letter}
    </span>
  );
}
