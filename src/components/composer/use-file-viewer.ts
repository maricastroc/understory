import { useRef, useState } from "react";
import { type SymbolSpan, enclosingSymbol } from "@/lib/collect/symbol";

export type OpenFile = { path: string; lines: string[] };

export function useFileViewer(repoPath: string) {
  const [file, setFile] = useState<OpenFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStart, setSelectedStart] = useState<number | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<number | null>(null);
  const [enclosing, setEnclosing] = useState<SymbolSpan | null>(null);
  const anchor = useRef<number | null>(null);

  function clearSelection() {
    anchor.current = null;
    setSelectedStart(null);
    setSelectedEnd(null);
    setEnclosing(null);
  }

  function selectLine(n: number, extend = false) {
    if (extend && anchor.current !== null) {
      setSelectedStart(Math.min(anchor.current, n));
      setSelectedEnd(Math.max(anchor.current, n));
    } else {
      anchor.current = n;
      setSelectedStart(n);
      setSelectedEnd(n);
      setEnclosing(file ? enclosingSymbol(file.lines, n, file.path) : null);
    }
  }

  function expandToSymbol() {
    if (!enclosing) return;
    setSelectedStart(enclosing.start);
    setSelectedEnd(enclosing.end);
  }

  async function open(path: string, token?: string) {
    setLoading(true);
    setError(null);
    setFile(null);
    clearSelection();
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
    clearSelection();
  }

  return {
    file,
    loading,
    error,
    selectedStart,
    selectedEnd,
    enclosing,
    selectLine,
    expandToSymbol,
    open,
    reset,
  };
}
