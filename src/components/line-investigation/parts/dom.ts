export function cssEscape(value: string): string {
  return typeof CSS !== "undefined" && CSS.escape
    ? CSS.escape(value)
    : value.replace(/["\\]/g, "\\$&");
}

export function reducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

export function reveal(el: Element | null | undefined, block: ScrollLogicalPosition) {
  el?.scrollIntoView?.({ block, behavior: reducedMotion() ? "auto" : "smooth" });
}
