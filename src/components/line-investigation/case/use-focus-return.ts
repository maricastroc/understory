"use client";

import { useLayoutEffect, useRef } from "react";

export function useFocusReturn(open: boolean) {
  const invoker = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);

  useLayoutEffect(() => {
    if (open && !wasOpen.current) {
      const active = document.activeElement;
      invoker.current = active instanceof HTMLElement ? active : null;
    }
    if (!open && wasOpen.current && invoker.current?.isConnected) {
      invoker.current.focus();
    }
    wasOpen.current = open;
  }, [open]);
}
