"use client";

import { useEffect, useRef, useState } from "react";
import type { ArtifactRef, DigResult, InvestigateInput } from "@git-investigator/core/types";
import type { AuthUser } from "./use-auth";
import type { CaseDraft } from "./case-draft";
import type { CaseParent } from "./case-parent";
import { draftResult } from "./draft-result";
import type { SavedCase } from "./saved-case";
import { fetchSavedCases } from "./saved-cases";

const DEFAULT_REPO = process.env.NEXT_PUBLIC_DEFAULT_REPO || ".demo/payments-service";
const FIRST_CASE = 2049;

export type Form = InvestigateInput;
export type Entry = {
  caseId: string;
  form: Form;
  result: DigResult;
  parentCaseId?: string;
  parentQuestion?: string;
  pending?: boolean;
  mountKey?: string;
};
export type View = "browse" | "case";

type StreamMessage =
  | { phase: "evidence"; evidence: DigResult["evidence"] }
  | { phase: "final"; narrative: DigResult["narrative"]; error?: string };

async function readNdjson(
  body: ReadableStream<Uint8Array>,
  onMessage: (m: StreamMessage) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl = buf.indexOf("\n");
    while (nl >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (line) onMessage(JSON.parse(line) as StreamMessage);
      nl = buf.indexOf("\n");
    }
  }
  const tail = buf.trim();
  if (tail) onMessage(JSON.parse(tail) as StreamMessage);
}

const caseNumber = (caseId: string) => Number.parseInt(caseId.replace(/^GI-/, ""), 10) || 0;

export function useInvestigation(user: AuthUser | null) {
  const [repoPath, setRepoPath] = useState(DEFAULT_REPO);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<Entry[]>([]);

  const [loaded, setLoaded] = useState(false);

  const [persisted, setPersisted] = useState(false);

  const [activeId, setActiveId] = useState<string | null>(null);

  const [view, setView] = useState<View>("browse");

  const [resetKey, setResetKey] = useState(0);

  const [draft, setDraft] = useState<CaseDraft | null>(null);

  const counter = useRef(FIRST_CASE);

  const draftSeq = useRef(0);

  useEffect(() => {
    let alive = true;
    fetchSavedCases().then(({ cases, persisted: synced }) => {
      if (!alive) return;
      const questions = new Map(cases.map((c) => [c.caseId, c.question]));
      setHistory(
        cases.map((s) => ({
          caseId: s.caseId,
          form: { repoPath: s.repoPath, location: s.location, question: s.question },
          result: s.result,
          ...(s.parentCaseId
            ? { parentCaseId: s.parentCaseId, parentQuestion: questions.get(s.parentCaseId) }
            : {}),
        })),
      );
      setPersisted(synced);
      setLoaded(true);
      const maxNum = cases.reduce((m, s) => Math.max(m, caseNumber(s.caseId)), 0);
      counter.current = Math.max(FIRST_CASE, maxNum + 1);
    });
    return () => {
      alive = false;
    };
  }, [user]);

  const current = history.find((e) => e.caseId === activeId) ?? null;

  async function submit(
    reqBody: object,
    buildEntry: (caseId: string, data: DigResult) => Entry,
    buildSave: (caseId: string, data: DigResult) => SavedCase,
    token?: string,
    draftOf?: Omit<CaseDraft, "key" | "error"> & { key?: string },
  ) {
    if (loading) return;
    setLoading(true);
    setError(null);
    setView("case");

    const key = draftOf ? (draftOf.key ?? `draft-${++draftSeq.current}`) : undefined;
    if (draftOf && key) {
      setActiveId(null);
      setDraft({ key, form: draftOf.form, parent: draftOf.parent, error: null });
    }
    const settleDraft = () => {
      if (key) setDraft((d) => (d?.key === key ? null : d));
    };
    const fail = (message: string) => {
      if (key) {
        setDraft((d) => (d?.key === key ? { ...d, error: message } : d));
        return;
      }
      setError(message);
      setView("browse");
    };

    const persist = (caseId: string, data: DigResult) => {
      if (!user) return;
      void fetch("/api/investigations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildSave(caseId, data)),
      }).catch(() => {});
    };

    try {
      const res = await fetch("/api/dig", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-github-token": token } : {}),
        },
        body: JSON.stringify(reqBody),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        fail(data.error || `Request failed (${res.status})`);
        return;
      }

      const streamed = !!res.body && (res.headers.get("content-type") ?? "").includes("ndjson");

      if (!streamed) {
        const data = (await res.json()) as DigResult & { error?: string };
        if (!data.evidence) {
          fail(data.error || `Request failed (${res.status})`);
          return;
        }
        const caseId = `GI-${counter.current++}`;
        setHistory((h) => [{ ...buildEntry(caseId, data), mountKey: key }, ...h]);
        setActiveId(caseId);
        settleDraft();
        persist(caseId, data);
        return;
      }

      let caseId: string | null = null;
      let evidence: DigResult["evidence"] | null = null;

      await readNdjson(res.body!, (msg) => {
        if (msg.phase === "evidence") {
          evidence = msg.evidence;
          const id = `GI-${counter.current++}`;
          caseId = id;
          const partial: DigResult = { evidence: msg.evidence, narrative: null };
          setHistory((h) => [{ ...buildEntry(id, partial), pending: true, mountKey: key }, ...h]);
          setActiveId(id);
          settleDraft();
          setLoading(false);
        } else if (msg.phase === "final") {
          const id = caseId;
          const ev = evidence;
          if (!id || !ev) return;
          const full: DigResult = {
            evidence: ev,
            narrative: msg.narrative,
            ...(msg.error ? { error: msg.error } : {}),
          };
          setHistory((h) =>
            h.map((e) => (e.caseId === id ? { ...e, ...buildEntry(id, full), pending: false } : e)),
          );
          persist(id, full);
        }
      });

      if (!caseId) fail("The investigation did not return any evidence.");
    } catch (err) {
      fail(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function investigate(
    input: Form,
    token?: string,
    language?: string,
    parent?: CaseParent,
    draftKey?: string,
  ) {
    await submit(
      { ...input, ...(language ? { language } : {}) },
      (caseId, data) => ({
        caseId,
        form: input,
        result: data,
        ...(parent ? { parentCaseId: parent.caseId, parentQuestion: parent.question } : {}),
      }),
      (caseId, data) => ({
        caseId,
        question: input.question,
        repoPath: input.repoPath,
        location: input.location,
        result: data,
        ...(parent ? { parentCaseId: parent.caseId } : {}),
      }),
      token,
      draftResult(input) ? { form: input, parent, key: draftKey } : undefined,
    );
  }

  function retryDraft(token?: string, language?: string) {
    if (!draft || loading) return;
    void investigate(draft.form, token, language, draft.parent, draft.key);
  }

  async function drillInto(
    parentCaseId: string,
    parentQuestion: string,
    anchor: ArtifactRef,
    repoPath: string,
    token?: string,
    language?: string,
  ) {
    const label = anchor.ref ?? anchor.id;
    await submit(
      { repoPath, target: anchor, ...(language ? { language } : {}) },
      (caseId, data) => ({
        caseId,
        form: { repoPath, location: label, question: data.evidence.question },
        result: data,
        parentCaseId,
        parentQuestion,
      }),
      (caseId, data) => ({
        caseId,
        question: data.evidence.question,
        repoPath,
        location: label,
        result: data,
        parentCaseId,
      }),
      token,
    );
  }

  function selectCase(id: string) {
    if (history.some((e) => e.caseId === id)) {
      setActiveId(id);
      setView("case");
      setError(null);
      setDraft((d) => (d?.error ? null : d));
    }
  }

  function backToCode() {
    setView("browse");
    setError(null);
    setDraft((d) => (d?.error ? null : d));
  }

  function newInvestigation() {
    setResetKey((k) => k + 1);
    setView("browse");
    setActiveId(null);
    setError(null);
    setDraft((d) => (d?.error ? null : d));
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

  const browsing = view === "browse";

  return {
    repoPath,
    setRepoPath,
    loading,
    error,
    history,
    loaded,
    persisted,
    activeId,
    view,
    draft,
    resetKey,
    current,
    browsing,
    investigate,
    drillInto,
    retryDraft,
    selectCase,
    backToCode,
    newInvestigation,
    removeCase,
  };
}
