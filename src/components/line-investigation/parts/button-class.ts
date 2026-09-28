const BASE =
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 border font-li-body leading-[1.2] font-medium whitespace-nowrap transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-li-focus motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-45";

const VARIANT = {
  primary:
    "relative border-li-brand bg-li-brand text-white hover:border-li-brand-press hover:bg-li-brand-press active:bg-li-brand-press",
  secondary: "border-li-divider text-li-ink hover:bg-li-neutral-200 active:bg-li-neutral-300",
  ghost: "border-transparent text-li-ink hover:bg-li-neutral-200 active:bg-li-neutral-300",
  icon: "size-7 border-transparent text-li-ink hover:bg-li-neutral-200 active:bg-li-neutral-300",
} as const;

const SIZE = {
  xs: "h-6 px-2 text-[11px]",
  sm: "h-7 px-2.5 text-[12.5px]",
  md: "h-8 px-3 text-sm",
  field: "h-9 px-3 text-[13px]",
  lg: "h-11 px-4 text-[15px]",
  xl: "h-14 px-6 text-[15px]",
} as const;

export function liButton(
  variant: keyof typeof VARIANT,
  className = "",
  size: keyof typeof SIZE = "md",
): string {
  const sizing = variant === "icon" ? "" : SIZE[size];
  return `${BASE} ${VARIANT[variant]} ${sizing} ${className}`.replace(/\s+/g, " ").trim();
}
