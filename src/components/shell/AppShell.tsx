"use client";

import type { ReactNode } from "react";
import { lineInvestigationFonts } from "../line-investigation/fonts";
import { RailDrawer } from "./RailDrawer";

export function AppShell({
  header,
  rail,
  drawerOpen,
  onCloseDrawer,
  children,
}: {
  header: ReactNode;
  rail: (onClose?: () => void) => ReactNode;
  drawerOpen: boolean;
  onCloseDrawer: () => void;
  children: ReactNode;
}) {
  return (
    <div className={`${lineInvestigationFonts} min-h-screen bg-li-paper`}>
      {header}
      <div className="grid grid-cols-[256px_minmax(0,1fr)] max-[767px]:grid-cols-1">
        <div className="sticky top-14 h-[calc(100vh-3.5rem)] border-r border-li-divider max-[767px]:hidden">
          {rail()}
        </div>
        <main className="min-w-0">{children}</main>
      </div>
      <RailDrawer open={drawerOpen} onClose={onCloseDrawer}>
        {rail(onCloseDrawer)}
      </RailDrawer>
    </div>
  );
}
