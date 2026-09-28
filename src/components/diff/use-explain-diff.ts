"use client";

import { useState } from "react";
import type { DiffResult } from "@git-investigator/core/diff/types";
import { readJson } from "@/lib/read-json";

export function useExplainDiff() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DiffResult | null>(null);

  async function run(pr: string, language: "en" | "pt" = "en", token?: string) {
    if (loading || !pr.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/explain-diff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-github-token": token } : {}),
        },
        body: JSON.stringify({ pr, language }),
      });
      const data = await readJson<DiffResult & { error?: string }>(res);
      if (!res.ok || !data.findings) {
        setError(data.error || `Request failed (${res.status})`);
        setResult(null);
        return;
      }
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return { loading, error, result, run };
}
