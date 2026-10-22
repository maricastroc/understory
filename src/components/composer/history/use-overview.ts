"use client";

import type { TreeOverview } from "@understory/core/types";
import { useEffect, useState } from "react";
import { type ApiFailure, failureFrom, NETWORK_FAILURE } from "@/lib/api-error";

export function useOverview(
  repoPath: string,
  ready: boolean,
  cases: string[],
  token?: string,
): { overview: TreeOverview | null; error: ApiFailure | null } {
  const [state, setState] = useState<{
    key: string;
    overview: TreeOverview | null;
    error: ApiFailure | null;
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
        const data = await res.json().catch(() => null);
        setState(
          res.ok && data
            ? { key, overview: data as TreeOverview, error: null }
            : { key, overview: null, error: failureFrom(res, data) },
        );
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setState({ key, overview: null, error: NETWORK_FAILURE });
      });
    return () => ctrl.abort();
  }, [key, repoPath, caseKey, token]);

  return state.key === key ? state : { overview: null, error: null };
}
