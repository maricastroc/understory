"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { narrativeLanguage } from "@understory/core/narrative-language";
import type {
  ArtifactRef,
  DigResult,
  InvestigateInput,
  Lineage,
  NarrativeLanguage,
} from "@understory/core/types";
import { type ApiFailure, failureFrom, NETWORK_FAILURE, thrownFailure } from "@/lib/api-error";
import { readJson } from "@/lib/read-json";
import type { AuthUser } from "./use-auth";
import type { CaseDraft } from "./case-draft";
import type { CaseParent } from "./case-parent";
import { draftResult } from "./draft-result";
import type { SavedCase } from "./saved-case";
import { fetchSavedCases } from "./saved-cases";
import { demoLine } from "./demo-line";

export const DEFAULT_REPO = process.env.NEXT_PUBLIC_DEFAULT_REPO || ".demo/payments-service";
export const DEMO_LINE = demoLine(process.env.NEXT_PUBLIC_DEFAULT_LINE);
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
  rewriting?: NarrativeLanguage | null;
  rewriteError?: { language: NarrativeLanguage; failure: ApiFailure } | null;
  alternates?: Partial<Record<NarrativeLanguage, DigResult["narrative"]>>;
};
export type View = "browse" | "case";

type StreamMessage =
  | { phase: "evidence"; evidence: DigResult["evidence"] }
  | { phase: "final"; narrative: DigResult["narrative"]; error?: string }
  | { phase: "lineage"; lineage: Lineage };

function forTheWriter(evidence: DigResult["evidence"]): DigResult["evidence"] {
  const sent = { ...evidence };
  delete sent.lineage;
  return sent;
}

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

  const [error, setError] = useState<ApiFailure | null>(null);

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
  const historyRef = useRef(history);
  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  const latest = useRef(new Map<string, DigResult>());
  const saving = useRef(new Map<string, Promise<void>>());
  const saveCase = useCallback(
    (saved: SavedCase) => {
      if (!user) return;
      const send = () =>
        fetch("/api/investigations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(saved),
        }).then(
          () => {},
          () => {},
        );
      saving.current.set(
        saved.caseId,
        (saving.current.get(saved.caseId) ?? Promise.resolve()).then(send),
      );
    },
    [user],
  );

  const rewrite = useCallback(
    async (caseId: string, language: NarrativeLanguage) => {
      const entry = historyRef.current.find((e) => e.caseId === caseId);
      const previous = entry?.result.narrative;
      if (!entry || !previous || entry.rewriting) return;
      const from = narrativeLanguage(previous);
      const alternates = { ...entry.alternates, ...(from ? { [from]: previous } : {}) };
      const patch = (fn: (e: Entry) => Entry) =>
        setHistory((h) => h.map((e) => (e.caseId === caseId ? fn(e) : e)));
      const save = (result: DigResult) =>
        saveCase({
          caseId,
          question: entry.form.question,
          repoPath: entry.form.repoPath,
          location: entry.form.location,
          result,
          ...(entry.parentCaseId ? { parentCaseId: entry.parentCaseId } : {}),
        });
      const settle = (narrative: NonNullable<DigResult["narrative"]>) => {
        const result = { ...(latest.current.get(caseId) ?? entry.result), narrative };
        latest.current.set(caseId, result);
        patch((e) => ({
          ...e,
          result: { ...e.result, narrative },
          alternates,
          rewriting: null,
          rewriteError: null,
        }));
        save(result);
      };

      const cached = entry.alternates?.[language];
      if (cached) {
        settle(cached);
        return;
      }
      patch((e) => ({ ...e, rewriting: language, rewriteError: null }));
      const failed = (failure: ApiFailure) =>
        patch((e) => ({ ...e, rewriting: null, rewriteError: { language, failure } }));
      try {
        const res = await fetch("/api/narrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ evidence: forTheWriter(entry.result.evidence), language }),
        }).catch(() => null);
        if (!res) {
          failed(NETWORK_FAILURE);
          return;
        }
        const data = (await res.json().catch(() => null)) as {
          narrative?: DigResult["narrative"];
        } | null;
        if (!res.ok || !data?.narrative) {
          failed(failureFrom(res, data));
          return;
        }
        settle(data.narrative);
      } catch (err) {
        failed(thrownFailure(err));
      }
    },
    [saveCase],
  );

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
    const fail = (failure: ApiFailure) => {
      if (key) {
        setDraft((d) => (d?.key === key ? { ...d, error: failure } : d));
        return;
      }
      setError(failure);
      setView("browse");
    };

    const persist = (caseId: string, data: DigResult) => saveCase(buildSave(caseId, data));

    try {
      const res = await fetch("/api/dig", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-github-token": token } : {}),
        },
        body: JSON.stringify(reqBody),
      }).catch(() => null);

      if (!res) {
        fail(NETWORK_FAILURE);
        return;
      }

      if (!res.ok) {
        fail(failureFrom(res, await res.json().catch(() => null)));
        return;
      }

      const streamed = !!res.body && (res.headers.get("content-type") ?? "").includes("ndjson");

      if (!streamed) {
        const data = await readJson<DigResult & { error?: string }>(res);
        if (!data.evidence) {
          fail(data.error ? failureFrom(res, data) : { code: "no-evidence", detail: null });
          return;
        }
        const caseId = `GI-${counter.current++}`;
        latest.current.set(caseId, data);
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
          latest.current.set(id, full);
          setHistory((h) =>
            h.map((e) => (e.caseId === id ? { ...e, ...buildEntry(id, full), pending: false } : e)),
          );
          persist(id, full);
        } else if (msg.phase === "lineage") {
          const id = caseId;
          const base = id ? latest.current.get(id) : undefined;
          if (!id || !base || !msg.lineage) return;
          const lineage = msg.lineage;
          const full = { ...base, evidence: { ...base.evidence, lineage } };
          latest.current.set(id, full);
          setHistory((h) =>
            h.map((e) =>
              e.caseId === id
                ? { ...e, result: { ...e.result, evidence: { ...e.result.evidence, lineage } } }
                : e,
            ),
          );
          persist(id, full);
        }
      });

      if (!caseId) fail({ code: "no-evidence", detail: null });
    } catch (err) {
      fail(thrownFailure(err));
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
    latest.current.delete(id);
    if (user) {
      const remove = () =>
        fetch(`/api/investigations/${encodeURIComponent(id)}`, { method: "DELETE" }).then(
          () => {},
          () => {},
        );
      saving.current.set(id, (saving.current.get(id) ?? Promise.resolve()).then(remove));
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
    rewrite,
    selectCase,
    backToCode,
    newInvestigation,
    removeCase,
  };
}
