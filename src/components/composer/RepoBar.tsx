import type { RepoMeta } from "@/lib/types";
import { Alert, Check } from "../icons";

export function RepoBar({
  repoPath,
  onEdit,
  onOpen,
  connecting,
  ready,
  meta,
  error,
}: {
  repoPath: string;
  onEdit: (v: string) => void;
  onOpen: () => void;
  connecting: boolean;
  ready: boolean;
  meta: RepoMeta | null;
  error: string | null;
}) {
  return (
    <>
      <div className="flex items-center gap-3 border-b border-line px-3.5 py-2.5">
        <span className="w-16 shrink-0 text-[11px] font-semibold tracking-[0.06em] text-ink-3 uppercase">
          Repo
        </span>
        <input
          aria-label="Repository URL or path"
          value={repoPath}
          onChange={(e) => onEdit(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onOpen()}
          placeholder="https://github.com/owner/repo  ·  owner/repo  ·  ./local/path"
          className="flex-1 bg-transparent font-mono text-[13px] text-ink outline-none placeholder:font-sans placeholder:text-ink-3"
        />
        <button
          type="button"
          onClick={onOpen}
          disabled={connecting || ready}
          className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-line-2 px-2.5 text-[12.5px] font-medium text-ink-2 transition-colors hover:bg-inset disabled:opacity-60"
        >
          {connecting ? "Opening…" : ready ? "Opened" : "Open"}
        </button>
      </div>

      {connecting && (
        <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-3.5 py-2 text-[12.5px] text-ink-2">
          <span className="size-3.5 animate-spin rounded-full border-2 border-line-2 border-t-accent" />
          Opening repository… cloning from a URL the first time can take a moment.
        </div>
      )}
      {ready && meta && (
        <div className="flex items-center gap-2 border-b border-line bg-good-tint/50 px-3.5 py-2 text-[12.5px] text-ink-2">
          <Check className="size-3.5 text-good" />
          <span className="font-medium text-ink">
            {meta.kind === "github" ? "GitHub" : meta.kind === "remote" ? "Cloned" : "Local"}
          </span>
          <span className="font-mono">{meta.name}</span>
          {meta.branch && <span className="text-ink-3">· branch {meta.branch}</span>}
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 border-b border-line bg-crit-tint px-3.5 py-2 text-[12.5px] text-crit">
          <Alert className="mt-0.5 size-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </>
  );
}
