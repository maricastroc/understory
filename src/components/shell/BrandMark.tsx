import Link from "next/link";

export function BrandMark() {
  return (
    <Link
      href="/"
      className="flex shrink-0 items-center gap-2.5 text-li-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-li-focus"
    >
      <span aria-hidden className="relative size-5">
        <span className="absolute inset-x-0 top-1.25 h-0.5 bg-li-datum" />
        <span className="absolute top-1.25 left-2.25 h-3 w-0.5 bg-li-ink" />
        <span className="absolute top-3.5 left-1.5 size-1.75 rotate-45 bg-li-ink" />
      </span>
      <span className="text-base font-semibold tracking-[-0.01em] whitespace-nowrap">
        Git Investigator
      </span>
    </Link>
  );
}
