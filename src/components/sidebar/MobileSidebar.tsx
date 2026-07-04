"use client";

import { useEffect } from "react";
import type { AuthUser } from "../investigator/use-auth";
import { SidebarBody } from "./SidebarBody";
import type { CaseItem } from "./case-item";

export function MobileSidebar({
  open,
  onClose,
  items,
  activeId,
  onSelect,
  onRemove,
  filtering = false,
  user,
}: {
  open: boolean;
  onClose: () => void;
  items: CaseItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  filtering?: boolean;
  user?: AuthUser | null;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-40 md:hidden ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-ink/30 backdrop-blur-[1px] transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Investigations"
        className={`absolute inset-y-0 left-0 flex w-[min(19rem,85vw)] flex-col border-r border-line-2 bg-surface-2 shadow-panel transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarBody
          items={items}
          activeId={activeId}
          onSelect={onSelect}
          onRemove={onRemove}
          filtering={filtering}
          user={user}
          onClose={onClose}
        />
      </aside>
    </div>
  );
}
