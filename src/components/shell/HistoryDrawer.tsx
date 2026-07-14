"use client";

import { useEffect, useRef } from "react";
import { HistoryPanel, type HistoryPanelProps } from "./HistoryPanel";

export function HistoryDrawer({
  open,
  onClose,
  ariaLabel,
  ...panel
}: HistoryPanelProps & { open: boolean; onClose: () => void; ariaLabel: string }) {
  const asideRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const selector = 'button, a[href], input, [tabindex]:not([tabindex="-1"])';
    const focusables = () => [...(asideRef.current?.querySelectorAll<HTMLElement>(selector) ?? [])];

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const f = focusables();
      if (f.length === 0) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKey);
    focusables()[0]?.focus();

    return () => {
      window.removeEventListener("keydown", onKey);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-40 md:hidden ${open ? "" : "pointer-events-none"}`}
      inert={!open}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-ink/30 backdrop-blur-[1px] transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />
      <aside
        ref={asideRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={`absolute inset-y-0 left-0 flex w-[min(19rem,85vw)] flex-col border-r border-line-2 bg-surface-2 shadow-panel transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <HistoryPanel {...panel} onClose={onClose} />
      </aside>
    </div>
  );
}
