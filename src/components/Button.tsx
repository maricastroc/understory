import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary";
type Size = "xs" | "sm" | "md" | "lg";

const BASE =
  "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md font-medium whitespace-nowrap transition-colors disabled:cursor-default disabled:opacity-70";

const VARIANT: Record<Variant, string> = {
  primary: "bg-accent text-white shadow-sm hover:bg-accent-press",
  secondary: "border border-line-2 bg-surface text-ink hover:bg-inset",
};

const SIZE: Record<Size, string> = {
  xs: "h-7 gap-1.5 px-2.5 text-[12.5px]",
  sm: "h-8 gap-1.5 px-3 text-[13px]",
  md: "h-9 gap-1.5 px-3.5 text-[13px]",
  lg: "h-11 gap-2 px-5 text-[14px]",
};

export function buttonClass(opts?: { variant?: Variant; size?: Size; className?: string }) {
  const { variant = "primary", size = "md", className = "" } = opts ?? {};
  return `${BASE} ${VARIANT[variant]} ${SIZE[size]} ${className}`.trim();
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass({ variant, size, className })} {...props} />;
}
