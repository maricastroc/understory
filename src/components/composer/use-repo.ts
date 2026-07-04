import { useState } from "react";
import type { RepoMeta } from "@/lib/types";

export type Repo = ReturnType<typeof useRepo>;

export function useRepo() {
  const [connecting, setConnecting] = useState(false);
  const [ready, setReady] = useState(false);
  const [meta, setMeta] = useState<RepoMeta | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not open repository");
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
      setError(e instanceof Error ? e.message : String(e));
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
