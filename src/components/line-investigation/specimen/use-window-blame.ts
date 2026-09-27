"use client";

import type { BlameSpan } from "@git-investigator/core/types";
import { useEffect, useState } from "react";
import type { LineRange, WindowBlame } from "./types";

type Settled = { source: string; range: string; ok: boolean; spans: BlameSpan[] | null };

const UNPINNED: WindowBlame = { status: "unpinned", spans: null };

export function useWindowBlame(
  repo: string,
  path: string,
  sha: string | null,
  range: LineRange | null,
): WindowBlame {
  const source = sha ? new URLSearchParams({ repo, path, ref: sha }).toString() : null;
  const rangeQuery = range ? `start=${range.start}&end=${range.end}` : null;
  const [settled, setSettled] = useState<Settled | null>(null);

  useEffect(() => {
    if (!source || !rangeQuery) return;
    const ctrl = new AbortController();
    fetch(`/api/blame?${source}&${rangeQuery}`, { signal: ctrl.signal })
      .then(async (res) => {
        const data = (await res.json()) as { spans?: BlameSpan[] };
        const ok = res.ok && Array.isArray(data.spans);
        setSettled((prev) => ({
          source,
          range: rangeQuery,
          ok,
          spans: ok ? (data.spans ?? []) : prev?.source === source ? prev.spans : null,
        }));
      })
      .catch(() => {
        if (ctrl.signal.aborted) return;
        setSettled((prev) => ({
          source,
          range: rangeQuery,
          ok: false,
          spans: prev?.source === source ? prev.spans : null,
        }));
      });
    return () => ctrl.abort();
  }, [source, rangeQuery]);

  if (!source) return UNPINNED;
  const same = settled?.source === source ? settled : null;
  if (!same) return { status: "loading", spans: null };
  if (same.range !== rangeQuery) return { status: "loading", spans: same.spans };
  return same.ok ? { status: "ready", spans: same.spans } : { status: "unavailable", spans: null };
}
