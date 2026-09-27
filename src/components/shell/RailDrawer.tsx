"use client";

import { type ReactNode, useEffect, useRef } from "react";

export function RailDrawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const selector = 'button, a[href], input, [tabindex]:not([tabindex="-1"])';
    const focusables = () => [...(panel.current?.querySelectorAll<HTMLElement>(selector) ?? [])];
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const f = focusables();
      if (f.length === 0) return;
      if (e.shiftKey && document.activeElement === f[0]) {
        e.preventDefault();
        f[f.length - 1].focus();
      } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) {
        e.preventDefault();
        f[0].focus();
      }
    };
    window.addEventListener("keydown", onKey);
    focusables()[0]?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-40 min-[1360px]:hidden ${open ? "" : "pointer-events-none"}`}
      inert={!open}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-li-ink/30 transition-opacity duration-200 motion-reduce:transition-none ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Cases"
        className={`absolute inset-y-0 left-0 flex w-[min(17rem,85vw)] flex-col border-r border-li-divider bg-li-paper shadow-li-lg transition-transform duration-200 ease-out motion-reduce:transition-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
