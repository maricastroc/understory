import { useState } from "react";

export type OpenFile = { path: string; lines: string[] };

export function useFileViewer(repoPath: string) {
  const [file, setFile] = useState<OpenFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);

  async function open(path: string, token?: string) {
    setLoading(true);
    setError(null);
    setFile(null);
    setSelectedLine(null);
    try {
      const res = await fetch(
        `/api/file?repo=${encodeURIComponent(repoPath)}&path=${encodeURIComponent(path)}`,
        token ? { headers: { "x-github-token": token } } : undefined,
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not open file");
        return;
      }
      setFile({ path, lines: (data.content as string).replace(/\n$/, "").split("\n") });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setFile(null);
    setError(null);
    setSelectedLine(null);
  }

  return { file, loading, error, selectedLine, setSelectedLine, open, reset };
}
