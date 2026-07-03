import { useEffect, useRef, useState } from "react";

export function useFileSearch(repoPath: string, enabled: boolean, openedPath: string | undefined) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    const id = ++seq.current;
    const t = setTimeout(async () => {
      const q = query.trim();
      if (!enabled || q.length < 2 || openedPath === q) {
        if (id === seq.current) {
          setResults([]);
          setSearching(false);
        }
        return;
      }
      setSearching(true);
      try {
        const res = await fetch(
          `/api/files?repo=${encodeURIComponent(repoPath)}&q=${encodeURIComponent(q)}`,
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
    }, 220);
    return () => clearTimeout(t);
  }, [query, repoPath, enabled, openedPath]);

  function clear() {
    setResults([]);
    setError(null);
  }

  return { query, setQuery, results, searching, error, clear };
}
