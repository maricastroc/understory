import { useEffect, useRef, useState } from "react";

export function useFileSearch(
  repoPath: string,
  enabled: boolean,
  openedPath: string | undefined,
  token?: string,
) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    const id = ++seq.current;
    const q = query.trim();
    // A file is open (query holds its path) — the finder list is hidden.
    if (!enabled || openedPath === q) {
      if (id === seq.current) {
        setResults([]);
        setSearching(false);
      }
      return;
    }
    // Empty/short query fetches a default suggestion list; typed query searches.
    const isDefault = q.length < 2;
    const t = setTimeout(
      async () => {
        if (id === seq.current) setSearching(!isDefault);
        try {
          const res = await fetch(
            `/api/files?repo=${encodeURIComponent(repoPath)}&q=${encodeURIComponent(q)}`,
            token ? { headers: { "x-github-token": token } } : undefined,
          );
          const data = await res.json();
          if (id !== seq.current) return;
          if (!res.ok) {
            setError(data.error || "Search failed");
            setResults([]);
          } else {
            setError(null);
            setResults(data.files ?? []);
          }
        } catch (e) {
          if (id === seq.current) {
            setError(e instanceof Error ? e.message : String(e));
            setResults([]);
          }
        } finally {
          if (id === seq.current) setSearching(false);
        }
      },
      isDefault ? 0 : 220,
    );
    return () => clearTimeout(t);
  }, [query, repoPath, enabled, openedPath, token]);

  function clear() {
    setQuery("");
    setResults([]);
    setError(null);
  }

  return { query, setQuery, results, searching, error, clear };
}
