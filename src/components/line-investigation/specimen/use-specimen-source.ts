"use client";

import { useEffect, useState } from "react";
import type { SpecimenSource } from "./types";

type Settled = { key: string } & SpecimenSource;

const LOADING: SpecimenSource = { status: "loading", lines: null, error: null };

function toLines(content: string): string[] {
  return content.replace(/\r\n?/g, "\n").replace(/\n$/, "").split("\n");
}

export function useSpecimenSource(repo: string, path: string, sha: string | null): SpecimenSource {
  const params = new URLSearchParams({ repo, path, ...(sha ? { ref: sha } : {}) });
  const key = params.toString();
  const [settled, setSettled] = useState<Settled | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/file?${key}`, { signal: ctrl.signal })
      .then(async (res) => {
        const data = (await res.json()) as { content?: string; error?: string };
        if (!res.ok || typeof data.content !== "string") {
          setSettled({
            key,
            status: "error",
            lines: null,
            error: data.error ?? `HTTP ${res.status}`,
          });
          return;
        }
        setSettled({ key, status: "ready", lines: toLines(data.content), error: null });
      })
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return;
        setSettled({
          key,
          status: "error",
          lines: null,
          error: e instanceof Error ? e.message : String(e),
        });
      });
    return () => ctrl.abort();
  }, [key]);

  if (!settled || settled.key !== key) return LOADING;
  if (settled.status === "ready") return { status: "ready", lines: settled.lines, error: null };
  if (settled.status === "error") return { status: "error", lines: null, error: settled.error };
  return LOADING;
}
