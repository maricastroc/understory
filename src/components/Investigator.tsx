"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { DigResult } from "@/lib/types";
import { Composer, type InvestigateInput } from "./Composer";
import { Evidence } from "./Evidence";
import { Findings } from "./Findings";
import { Alert, Branch, FileIcon, Logo, Plus, Search } from "./icons";
import { levelLabel } from "./format";
import { RightRail } from "./RightRail";
import { Sidebar, type CaseItem } from "./Sidebar";
import { Timeline } from "./Timeline";
import { Pill } from "./ui";

const DEFAULT_REPO = ".demo/payments-service";

type Form = InvestigateInput;
type Entry = { caseId: string; form: Form; result: DigResult };
type View = "browse" | "case";

export function Investigator() {
  const [repoPath, setRepoPath] = useState(DEFAULT_REPO);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Entry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<View>("browse");
  const [resetKey, setResetKey] = useState(0);
  const counter = useRef(2049);

  const current = history.find((e) => e.caseId === activeId) ?? null;

  async function investigate(input: Form) {
    if (loading) return;
    setLoading(true);
    setError(null);
    setView("case");
    try {
      const res = await fetch("/api/dig", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    setResetKey((k) => k + 1); // remount Composer fresh (re-opens the repo)
    setView("browse");
    setActiveId(null);
    setError(null);
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

  return (
    <div className="flex h-screen flex-col">
      {/* ===== top bar ===== */}
      <header className="flex h-[52px] shrink-0 items-center gap-4 border-b border-line bg-surface px-4">
        <Link href="/" className="flex items-center gap-2.5 pr-2">
          <Logo className="size-6 text-accent" />
          <span className="text-[13.5px] font-semibold tracking-tight">Git Investigator</span>
        </Link>

        <div className="hidden items-center gap-2 rounded-md border border-line-2 px-2.5 py-1.5 md:flex">
          <span className="size-1.5 rounded-full bg-good" />
          <span className="font-mono text-[12.5px]">{basename(repoPath)}</span>
        </div>

        <div className="hidden max-w-[420px] flex-1 items-center gap-2 rounded-md border border-line bg-inset px-3 py-1.5 text-ink-3 lg:flex">
          <Search className="size-3.5" />
          <span className="text-[13px]">Search evidence, commits, PRs…</span>
          <span className="ml-auto flex gap-1">
            <kbd className="rounded border border-line-2 bg-surface px-1.5 font-mono text-[11px]">⌘</kbd>
            <kbd className="rounded border border-line-2 bg-surface px-1.5 font-mono text-[11px]">K</kbd>
          </span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={newInvestigation}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-accent-press"
          >
            <Plus className="size-3.5" />
            New investigation
          </button>
          <span className="grid size-7 place-items-center rounded-full bg-[#6B718A] text-[11px] font-semibold text-white">
            MC
          </span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <Sidebar items={items} activeId={view === "case" ? activeId : null} onSelect={selectCase} />

        {/* ===== workspace ===== */}
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1080px] px-8 py-6">
            {error && browsing && (
              <div className="mb-4 flex items-start gap-2 rounded-[10px] border border-crit/25 bg-crit-tint p-4 text-[13px] text-crit">
                <Alert className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Composer stays mounted so "back to code" preserves the open file. */}
            <div className={browsing ? "" : "hidden"}>
              <Composer
                key={resetKey}
                repoPath={repoPath}
                setRepoPath={setRepoPath}
                onInvestigate={investigate}
              />
            </div>

            {loading && <LoadingCard />}

            {!loading && view === "case" && current && <CaseView entry={current} onBack={backToCode} />}
          </div>
        </main>

        <RightRail result={view === "case" && !loading ? (current?.result ?? null) : null} />
      </div>
    </div>
  );
}

function basename(p: string) {
  return p.split("/").filter(Boolean).pop() ?? p;
}

function CaseView({ entry, onBack }: { entry: Entry; onBack: () => void }) {
  const { result, caseId, form } = entry;
  const ev = result.evidence;
  const narrative = result.narrative;
  const citedIds = new Set(narrative?.citations ?? []);
  const repoName = ev.repo.name ?? basename(ev.repo.path);
  const loc = `${ev.location.file}:${ev.location.startLine}${
    ev.location.endLine !== ev.location.startLine ? `-${ev.location.endLine}` : ""
  }`;

  const status = narrative
    ? narrative.recorded
      ? { tone: "good" as const, label: "Concluded" }
      : { tone: "warn" as const, label: "Inconclusive" }
    : { tone: "neutral" as const, label: "Evidence only" };

  return (
    <>
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-2 transition-colors hover:text-accent-press"
      >
        <svg viewBox="0 0 16 16" fill="none" className="size-3.5" aria-hidden>
          <path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to code
      </button>

      {/* case header */}
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-ink-2">
          <span className="font-mono">{repoName}</span>
          <span className="text-ink-3">/</span>
          <span className="font-mono">{caseId}</span>
          <Pill tone={status.tone} dot={status.tone !== "neutral"}>
            {status.label}
          </Pill>
        </div>

        <h1 className="max-w-[26ch] text-[26px] font-semibold leading-[1.24] tracking-tight text-balance">
          {form.question || "Why is this line the way it is?"}
        </h1>

        <div className="flex flex-wrap items-center gap-2">
          <Chip>
            <FileIcon className="size-3.5 text-ink-3" />
            <span className="font-mono text-[12px] text-ink">{loc}</span>
          </Chip>
          <Chip>
            <Branch className="size-3.5 text-ink-3" />
            branch <b className="font-semibold text-ink">{ev.repo.branch ?? "—"}</b>
          </Chip>
          <Chip>
            {ev.artifacts.length} exhibit{ev.artifacts.length !== 1 ? "s" : ""}
          </Chip>
          {narrative && (
            <Chip>
              confidence <b className="font-semibold text-ink">{levelLabel[narrative.confidence.level]}</b>
              <span className="tnum text-ink-3">· {Math.round(narrative.confidence.score * 100)}%</span>
            </Chip>
          )}
        </div>
      </div>

      {narrative ? (
        <Findings evidence={ev} narrative={narrative} />
      ) : (
        <div className="mt-6 flex items-start gap-2 rounded-[10px] border border-warn/30 bg-warn-tint p-4 text-[13px] text-warn">
          <Alert className="mt-0.5 size-4 shrink-0" />
          <span>{result.error ?? "No conclusion was produced — showing collected evidence only."}</span>
        </div>
      )}

      {ev.artifacts.length > 0 && <Timeline artifacts={ev.artifacts} citedIds={citedIds} />}
      {ev.artifacts.length > 0 && <Evidence evidence={ev} citedIds={citedIds} />}
    </>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 text-[12.5px] text-ink-2">
      {children}
    </span>
  );
}

function LoadingCard() {
  const stages = ["Collecting from git", "Building timeline", "Reconstructing the why", "Verifying citations"];
  return (
    <div className="rounded-[10px] border border-line bg-surface p-6 shadow-[0_1px_2px_rgba(20,22,30,0.04)]">
      <div className="flex items-center gap-3">
        <span className="size-4 animate-spin rounded-full border-2 border-line-2 border-t-accent" />
        <span className="text-[14px] font-semibold text-ink">Investigating…</span>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-3">
        {stages.map((s, i) => (
          <span key={s} className="flex items-center gap-2">
            {i > 0 && <span className="text-line-2">→</span>}
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}
