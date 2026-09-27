const BASE =
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 border font-li-body text-sm leading-[1.2] font-medium whitespace-nowrap transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-li-steel motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-45";

const VARIANT = {
  primary:
    "relative border-li-steel-700 bg-li-steel-700 px-3 py-1.75 text-li-paper hover:bg-li-steel-800",
  brand:
    "relative border-li-brand bg-li-brand px-3 py-1.75 text-white hover:border-li-brand-press hover:bg-li-brand-press",
  secondary: "border-li-divider px-3 py-1.75 text-li-ink hover:bg-li-neutral-200",
  ghost: "border-transparent px-1 py-1.75 text-li-steel-700 hover:bg-li-steel-100",
  icon: "size-7 border-transparent text-li-ink hover:bg-li-neutral-200",
} as const;

export function liButton(variant: keyof typeof VARIANT, className = ""): string {
  return `${BASE} ${VARIANT[variant]} ${className}`.trim();
}
