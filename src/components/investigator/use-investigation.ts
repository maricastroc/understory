"use client";

import { useRef, useState } from "react";
import type { DigResult, InvestigateInput } from "@/lib/types";
import type { CaseItem } from "../sidebar/case-item";

const DEFAULT_REPO = process.env.NEXT_PUBLIC_DEFAULT_REPO || ".demo/payments-service";

export type Form = InvestigateInput;
export type Entry = { caseId: string; form: Form; result: DigResult };
export type View = "browse" | "case";

export function useInvestigation() {
  const [repoPath, setRepoPath] = useState(DEFAULT_REPO);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Entry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<View>("browse");
  const [resetKey, setResetKey] = useState(0);
  const counter = useRef(2049);

  const current = history.find((e) => e.caseId === activeId) ?? null;

  async function investigate(input: Form, token?: string) {
    if (loading) return;
    setLoading(true);
    setError(null);
    setView("case");
    try {
      const res = await fetch("/api/dig", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-github-token": token } : {}),
        },
        body: JSON.stringify(input),
      });
      const data = (await res.json()) as DigResult & { error?: string };
      if (!res.ok || !data.evidence) {
        setError(data.error || `Request failed (${res.status})`);
        setView("browse");
        return;
      }
      const caseId = `GI-${counter.current++}`;
      setHistory((h) => [{ caseId, form: input, result: data }, ...h]);
      setActiveId(caseId);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setView("browse");
    } finally {
      setLoading(false);
    }
  }

  function selectCase(id: string) {
    if (history.some((e) => e.caseId === id)) {
      setActiveId(id);
      setView("case");
      setError(null);
    }
  }

  function backToCode() {
    setView("browse");
    setError(null);
  }

  function newInvestigation() {
    setResetKey((k) => k + 1);
    setView("browse");
    setActiveId(null);
    setError(null);
  }

  function removeCase(id: string) {
    setHistory((h) => h.filter((e) => e.caseId !== id));
    if (activeId === id) {
      setActiveId(null);
      setView("browse");
      setError(null);
    }
  }

  const items: CaseItem[] = history.map((e) => ({
    caseId: e.caseId,
    question: e.form.question || "(no question asked)",
    recorded: e.result.narrative?.recorded ?? false,
    hasNarrative: !!e.result.narrative,
    level: e.result.narrative?.confidence.level ?? "low",
    score: e.result.narrative?.confidence.score ?? 0,
  }));

  const browsing = view === "browse" && !loading;

  return {
    repoPath,
    setRepoPath,
    loading,
    error,
    items,
    activeId,
    view,
    resetKey,
    current,
    browsing,
    investigate,
    selectCase,
    backToCode,
    newInvestigation,
    removeCase,
  };
}
