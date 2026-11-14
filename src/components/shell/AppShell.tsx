"use client";

import { useState, type ReactNode } from "react";
import { useMessages } from "@/i18n/LocaleProvider";
import { RailDrawer } from "./RailDrawer";

export function AppShell({
  header,
  rail,
  strip,
  drawerOpen,
  onCloseDrawer,
  children,
}: {
  header: ReactNode;
  rail: (onClose?: () => void, onCollapse?: () => void) => ReactNode;
  strip: ReactNode;
  drawerOpen: boolean;
  onCloseDrawer: () => void;
  children: ReactNode;
}) {
  const m = useMessages();
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div data-rail={collapsed ? "collapsed" : "open"} className="min-h-screen bg-li-paper">
      {header}
      <div
        className={`grid max-[1360px]:grid-cols-[56px_minmax(0,1fr)] max-[820px]:grid-cols-1 ${
          collapsed ? "grid-cols-[56px_minmax(0,1fr)]" : "grid-cols-[256px_minmax(0,1fr)]"
        }`}
      >
        {collapsed ? (
          <div className="sticky top-14 flex h-[calc(100vh-3.5rem)] justify-center border-r border-li-divider pt-3 max-[1360px]:hidden">
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              aria-label={m.shell.expandInvestigations}
              aria-expanded={false}
              className="grid size-7 cursor-pointer place-items-center text-[15px] leading-none text-li-ink transition-colors hover:bg-li-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-li-focus motion-reduce:transition-none"
            >
              »
            </button>
          </div>
        ) : (
          <div className="sticky top-14 h-[calc(100vh-3.5rem)] border-r border-li-divider max-[1360px]:hidden">
            {rail(undefined, () => setCollapsed(true))}
          </div>
        )}
        <div className="sticky top-14 hidden h-[calc(100vh-3.5rem)] border-r border-li-divider min-[820px]:max-[1360px]:block">
          {strip}
        </div>
        <main className="min-w-0">{children}</main>
      </div>
      <RailDrawer open={drawerOpen} onClose={onCloseDrawer}>
        {rail(onCloseDrawer)}
      </RailDrawer>
    </div>
  );
}
