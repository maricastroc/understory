"use client";

import { useEffect, useRef, useState } from "react";
import type { DigResult, InvestigateInput } from "@/lib/types";
import type { CaseItem } from "../sidebar/case-item";
import type { AuthUser } from "./use-auth";

const DEFAULT_REPO = process.env.NEXT_PUBLIC_DEFAULT_REPO || ".demo/payments-service";
const FIRST_CASE = 2049;

export type Form = InvestigateInput;
export type Entry = { caseId: string; form: Form; result: DigResult };
export type View = "browse" | "case";

type SavedInvestigation = {
  caseId: string;
  question: string;
  repoPath: string;
  location: string;
  result: DigResult;
};

const caseNumber = (caseId: string) => Number.parseInt(caseId.replace(/^GI-/, ""), 10) || 0;

export function useInvestigation(user: AuthUser | null) {
  const [repoPath, setRepoPath] = useState(DEFAULT_REPO);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Entry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<View>("browse");
  const [resetKey, setResetKey] = useState(0);
  const counter = useRef(FIRST_CASE);

  // Signed-in users get their saved case files back; guests get an empty list
  // (the endpoint returns nothing without a session) and keep an in-memory session.
  useEffect(() => {
    let alive = true;
    fetch("/api/investigations")
      .then((r) => r.json())
      .then((d: { investigations?: SavedInvestigation[] }) => {
        if (!alive) return;
        const saved = d.investigations ?? [];
        setHistory(
          saved.map((s) => ({
            caseId: s.caseId,
            form: { repoPath: s.repoPath, location: s.location, question: s.question },
            result: s.result,
          })),
        );
        const maxNum = saved.reduce((m, s) => Math.max(m, caseNumber(s.caseId)), 0);
        counter.current = Math.max(FIRST_CASE, maxNum + 1);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user]);

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
      if (user) {
        void fetch("/api/investigations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caseId,
            question: input.question,
            repoPath: input.repoPath,
            location: input.location,
            result: data,
          }),
        }).catch(() => {});
      }
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
    if (user) {
      void fetch(`/api/investigations/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(
        () => {},
      );
    }
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
    answerable: e.result.narrative?.answerable !== false,
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
