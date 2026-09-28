"use client";

import type { ReactNode } from "react";
import { useElementWidth } from "../../use-element-width";

export function ScaledFrame({
  width,
  height,
  className = "",
  children,
}: {
  width: number;
  height: number;
  className?: string;
  children: ReactNode;
}) {
  const [ref, available] = useElementWidth();
  const scale = available > 0 ? Math.min(1, available / width) : 1;
  return (
    <div
      ref={ref}
      className={`relative w-full overflow-hidden ${className}`}
      style={{ height: Math.round(height * scale) }}
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{ width, height, transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}
