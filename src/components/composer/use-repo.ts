import { useState } from "react";
import type { RepoMeta } from "@understory/core/types";
import { type ApiFailure, failureFrom, NETWORK_FAILURE, thrownFailure } from "@/lib/api-error";

export type Repo = ReturnType<typeof useRepo>;

export function useRepo() {
  const [connecting, setConnecting] = useState(false);
  const [ready, setReady] = useState(false);
  const [meta, setMeta] = useState<RepoMeta | null>(null);
  const [error, setError] = useState<ApiFailure | null>(null);

  async function open(repoPath: string, token?: string) {
    const repo = repoPath.trim();
    if (!repo || connecting) return;
    setConnecting(true);
    setError(null);
    setMeta(null);
    setReady(false);
    try {
      const res = await fetch("/api/repo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-github-token": token } : {}),
        },
        body: JSON.stringify({ repo }),
      }).catch(() => null);
      if (!res) {
        setError(NETWORK_FAILURE);
        return;
      }
      const data = (await res.json().catch(() => null)) as RepoMeta | null;
      if (!res.ok || !data) {
        setError(failureFrom(res, data));
        return;
      }
      setMeta({
        name: data.name,
        branch: data.branch,
        kind: data.kind,
        htmlUrl: data.htmlUrl ?? null,
        private: data.private,
        description: data.description ?? null,
        language: data.language ?? null,
        stars: data.stars,
        forks: data.forks,
        openIssues: data.openIssues,
        pushedAt: data.pushedAt ?? null,
        topics: data.topics ?? [],
      });
      setReady(true);
    } catch (e) {
      setError(thrownFailure(e));
    } finally {
      setConnecting(false);
    }
  }

  function reset() {
    setReady(false);
    setMeta(null);
    setError(null);
  }

  return { connecting, ready, meta, error, open, reset };
}
