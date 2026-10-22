import { useEffect, useRef, useState } from "react";
import { type ApiFailure, failureFrom, NETWORK_FAILURE, thrownFailure } from "@/lib/api-error";

export function useFileSearch(repoPath: string, enabled: boolean, token?: string) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<ApiFailure | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    const id = ++seq.current;
    const q = query.trim();

    if (!enabled) {
      if (id === seq.current) {
        setResults([]);
        setSearching(false);
      }
      return;
    }

    const isDefault = q.length < 2;
    const t = setTimeout(
      async () => {
        if (id === seq.current) setSearching(!isDefault);
        try {
          const res = await fetch(
            `/api/files?repo=${encodeURIComponent(repoPath)}&q=${encodeURIComponent(q)}`,
            token ? { headers: { "x-github-token": token } } : undefined,
          ).catch(() => null);
          if (id !== seq.current) return;
          if (!res) {
            setError(NETWORK_FAILURE);
            setResults([]);
            return;
          }
          const data = (await res.json().catch(() => null)) as { files?: string[] } | null;
          if (id !== seq.current) return;
          if (!res.ok || !data) {
            setError(failureFrom(res, data));
            setResults([]);
          } else {
            setError(null);
            setResults(data.files ?? []);
          }
        } catch (e) {
          if (id === seq.current) {
            setError(thrownFailure(e));
            setResults([]);
          }
        } finally {
          if (id === seq.current) setSearching(false);
        }
      },
      isDefault ? 0 : 220,
    );
    return () => clearTimeout(t);
  }, [query, repoPath, enabled, token]);

  function clear() {
    setQuery("");
    setResults([]);
    setError(null);
  }

  return { query, setQuery, results, searching, error, clear };
}
