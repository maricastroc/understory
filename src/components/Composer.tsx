"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Check, FileIcon, Search } from "./icons";

export type InvestigateInput = { repoPath: string; location: string; question: string };
type RepoMeta = { name: string; branch: string | null; kind: "local" | "remote" };

const field =
  "h-9 rounded-md border border-line bg-inset px-3 text-[13px] text-ink outline-none placeholder:text-ink-3 focus:border-accent focus:bg-surface";

function Highlight({ text, q }: { text: string; q: string }) {
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0 || !q) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-accent-tint text-accent-press">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

export function Composer({
  repoPath,
  setRepoPath,
  onInvestigate,
}: {
  repoPath: string;
  setRepoPath: (s: string) => void;
  onInvestigate: (input: InvestigateInput) => void;
}) {
  const [connecting, setConnecting] = useState(false);
  const [repoReady, setRepoReady] = useState(false);
  const [repoMeta, setRepoMeta] = useState<RepoMeta | null>(null);
  const [repoError, setRepoError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [file, setFile] = useState<{ path: string; lines: string[] } | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [question, setQuestion] = useState("Why is this line the way it is?");
  const [fileError, setFileError] = useState<string | null>(null);
  const seq = useRef(0);

  async function openRepo() {
    const repo = repoPath.trim();
    if (!repo || connecting) return;
    setConnecting(true);
    setRepoError(null);
    setRepoMeta(null);
    setRepoReady(false);
    try {
      const res = await fetch("/api/repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRepoError(data.error || "Could not open repository");
        return;
      }
      setRepoMeta({ name: data.name, branch: data.branch, kind: data.kind });
      setRepoReady(true);
    } catch (e) {
      setRepoError(e instanceof Error ? e.message : String(e));
    } finally {
      setConnecting(false);
    }
  }

  // Auto-open whatever repo is prefilled on first mount.
  useEffect(() => {
    void openRepo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function editRepo(v: string) {
    setRepoPath(v);
    setRepoReady(false);
    setRepoMeta(null);
    setRepoError(null);
    setFile(null);
    setResults([]);
    setSelectedLine(null);
  }

  // debounced file search (only once a repo is open)
  useEffect(() => {
    const q = query.trim();
    if (!repoReady || q.length < 2 || file?.path === q) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const id = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/files?repo=${encodeURIComponent(repoPath)}&q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (id !== seq.current) return;
        if (!res.ok) {
          setFileError(data.error || "Search failed");
          setResults([]);
        } else {
          setFileError(null);
          setResults(data.files ?? []);
        }
      } catch (e) {
        if (id === seq.current) {
          setFileError(e instanceof Error ? e.message : String(e));
          setResults([]);
        }
      } finally {
        if (id === seq.current) setSearching(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [query, repoPath, file?.path, repoReady]);

  async function openFile(p: string) {
    setLoadingFile(true);
    setFileError(null);
    setResults([]);
    setQuery(p);
    setFile(null);
    setSelectedLine(null);
    try {
      const res = await fetch(`/api/file?repo=${encodeURIComponent(repoPath)}&path=${encodeURIComponent(p)}`);
      const data = await res.json();
      if (!res.ok) {
        setFileError(data.error || "Could not open file");
        return;
      }
      setFile({ path: p, lines: (data.content as string).replace(/\n$/, "").split("\n") });
    } catch (e) {
      setFileError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingFile(false);
    }
  }

  function run() {
    if (!file || !selectedLine) return;
    onInvestigate({ repoPath, location: `${file.path}:${selectedLine}`, question: question.trim() });
  }

  const q = query.trim();
  const showEmpty = repoReady && q.length >= 2 && !searching && results.length === 0 && file?.path !== q;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-[16px] font-semibold tracking-tight">Start an investigation</h2>
        <p className="mt-0.5 text-[13px] text-ink-2">
          Paste a GitHub repo (or a local path), find a file by name or symbol, then click the line
          you&apos;re curious about.
        </p>
      </div>

      {/* repo + search */}
      <div className="overflow-hidden rounded-[10px] border border-line bg-surface shadow-[0_1px_2px_rgba(20,22,30,0.04)]">
        <div className="flex items-center gap-3 border-b border-line px-3.5 py-2.5">
          <span className="w-16 shrink-0 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">Repo</span>
          <input
            aria-label="Repository URL or path"
            value={repoPath}
            onChange={(e) => editRepo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && openRepo()}
            placeholder="https://github.com/owner/repo  ·  owner/repo  ·  ./local/path"
            className="flex-1 bg-transparent font-mono text-[13px] text-ink outline-none placeholder:font-sans placeholder:text-ink-3"
          />
          <button
            type="button"
            onClick={openRepo}
            disabled={connecting || repoReady}
            className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-line-2 px-2.5 text-[12.5px] font-medium text-ink-2 transition-colors hover:bg-inset disabled:opacity-60"
          >
            {connecting ? "Opening…" : repoReady ? "Opened" : "Open"}
          </button>
        </div>

        {connecting && (
          <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-3.5 py-2 text-[12.5px] text-ink-2">
            <span className="size-3.5 animate-spin rounded-full border-2 border-line-2 border-t-accent" />
            Opening repository… cloning from a URL the first time can take a moment.
          </div>
        )}
        {repoReady && repoMeta && (
          <div className="flex items-center gap-2 border-b border-line bg-good-tint/50 px-3.5 py-2 text-[12.5px] text-ink-2">
            <Check className="size-3.5 text-good" />
            <span className="font-medium text-ink">{repoMeta.kind === "remote" ? "Cloned" : "Local"}</span>
            <span className="font-mono">{repoMeta.name}</span>
            {repoMeta.branch && <span className="text-ink-3">· branch {repoMeta.branch}</span>}
          </div>
        )}
        {repoError && (
          <div className="flex items-start gap-2 border-b border-line bg-crit-tint px-3.5 py-2 text-[12.5px] text-crit">
            <Alert className="mt-0.5 size-3.5 shrink-0" />
            <span>{repoError}</span>
          </div>
        )}

        <div className="flex items-center gap-3 px-3.5 py-2.5">
          <span className="w-16 shrink-0 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">Find</span>
          <Search className="size-4 shrink-0 text-ink-3" />
          <input
            aria-label="Search files or symbols"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={!repoReady}
            placeholder={repoReady ? "Search files or symbols…  e.g. chargeCustomer" : "Open a repository first"}
            className="flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-3 disabled:cursor-not-allowed"
          />
          {searching && <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-line-2 border-t-accent" />}
        </div>

        {results.length > 0 && (
          <ul className="max-h-64 overflow-y-auto border-t border-line">
            {results.map((f) => (
              <li key={f}>
                <button
                  onClick={() => openFile(f)}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left transition-colors hover:bg-inset"
                >
                  <FileIcon className="size-3.5 shrink-0 text-ink-3" />
                  <span className="truncate font-mono text-[12.5px] text-ink">
                    <Highlight text={f} q={q} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {showEmpty && (
          <div className="border-t border-line px-3.5 py-3 text-[12.5px] text-ink-3">
            No files match &ldquo;{q}&rdquo;.
          </div>
        )}
      </div>

      {fileError && (
        <div className="flex items-start gap-2 rounded-[10px] border border-crit/25 bg-crit-tint p-3 text-[12.5px] text-crit">
          <Alert className="mt-0.5 size-4 shrink-0" />
          <span>{fileError}</span>
        </div>
      )}

      {loadingFile && (
        <div className="rounded-[10px] border border-line bg-surface p-5 text-[13px] text-ink-3">Opening file…</div>
      )}

      {/* code viewer */}
      {file && (
        <div className="overflow-hidden rounded-[10px] border border-line bg-surface shadow-[0_1px_2px_rgba(20,22,30,0.04)]">
          <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-3.5 py-2">
            <FileIcon className="size-3.5 text-ink-3" />
            <span className="font-mono text-[12.5px] text-ink">{file.path}</span>
            <span className="ml-auto text-[11px] text-ink-3">
              {file.lines.length} lines · click a line to investigate it
            </span>
          </div>

          <div className="max-h-[440px] overflow-auto">
            <ol className="py-1">
              {file.lines.map((ln, i) => {
                const n = i + 1;
                const sel = selectedLine === n;
                return (
                  <li
                    key={n}
                    onClick={() => setSelectedLine(n)}
                    className={`group flex cursor-pointer font-mono text-[12.5px] leading-[1.6] ${
                      sel ? "bg-accent-tint" : "hover:bg-inset"
                    }`}
                  >
                    <span
                      className={`w-12 shrink-0 select-none border-r pr-3 text-right ${
                        sel ? "border-accent/40 text-accent-press" : "border-transparent text-ink-3"
                      }`}
                    >
                      {n}
                    </span>
                    <code className="flex-1 whitespace-pre px-3 text-ink">{ln || " "}</code>
                    {sel && <span className="shrink-0 self-center pr-3 text-[10.5px] font-semibold text-accent-press">selected</span>}
                  </li>
                );
              })}
            </ol>
          </div>

          {selectedLine && (
            <div className="flex flex-col gap-2 border-t border-line bg-surface-2 p-3 sm:flex-row sm:items-center">
              <span className="shrink-0 font-mono text-[12px] text-ink-2">
                {file.path}:{selectedLine}
              </span>
              <input
                aria-label="Question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && run()}
                placeholder="Why is this line the way it is?"
                className={`${field} flex-1`}
              />
              <button
                type="button"
                onClick={run}
                className="inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-accent px-4 text-[13px] font-medium text-white transition-colors hover:bg-accent-press"
              >
                Investigate this line
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
