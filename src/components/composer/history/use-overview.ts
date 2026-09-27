"use client";

import type { TreeOverview } from "@git-investigator/core/types";
import { useEffect, useState } from "react";

export function useOverview(
  repoPath: string,
  ready: boolean,
  cases: string[],
  token?: string,
): { overview: TreeOverview | null; error: string | null } {
  const [state, setState] = useState<{
    key: string;
    overview: TreeOverview | null;
    error: string | null;
  }>({ key: "", overview: null, error: null });
  const caseKey = cases.join("\n");
  const key = ready ? `${repoPath}\n${caseKey}` : "";

  useEffect(() => {
    if (!key) return;
    const ctrl = new AbortController();
    const params = new URLSearchParams({ repo: repoPath });
    for (const c of caseKey ? caseKey.split("\n") : []) params.append("case", c);
    fetch(`/api/overview?${params}`, {
      signal: ctrl.signal,
      ...(token ? { headers: { "x-github-token": token } } : {}),
    })
      .then(async (res) => {
        const data = await res.json();
        setState(
          res.ok
            ? { key, overview: data as TreeOverview, error: null }
            : { key, overview: null, error: data.error || "Could not read the file tree" },
        );
      })
      .catch((e) => {
        if (!ctrl.signal.aborted) setState({ key, overview: null, error: String(e) });
      });
    return () => ctrl.abort();
  }, [key, repoPath, caseKey, token]);

  return state.key === key ? state : { overview: null, error: null };
}
