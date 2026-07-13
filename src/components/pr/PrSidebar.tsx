"use client";

import type { DiffResult } from "@git-investigator/core/diff/types";
import { Close, PullRequest, User } from "../icons";
import type { AuthUser } from "../investigator/use-auth";
import { Avatar } from "../ui";
import type { PrEntry } from "./pr-entry";

function dotColor(r: DiffResult): string {
  if (r.findings.length === 0) return "bg-ink-3";
  return r.findings.some((f) => f.recorded && f.grounded) ? "bg-good" : "bg-warn";
}

function Row({
  entry,
  active,
  onSelect,
  onRemove,
}: {
  entry: PrEntry;
  active: boolean;
  onSelect: (key: string) => void;
  onRemove: (key: string) => void;
}) {
  const r = entry.result;
  const regions = r.triage.clustersDetailed;

  return (
    <div
      className={`group relative rounded-md transition-colors ${
        active ? "bg-accent-tint" : "hover:bg-inset"
      }`}
    >
      {active && <span className="absolute inset-y-2 -left-1 w-0.5 rounded bg-accent" />}
      <button
        onClick={() => onSelect(entry.key)}
        className="grid w-full cursor-pointer grid-cols-[auto_1fr] gap-2.5 rounded-md px-2.5 py-2 text-left"
      >
        <span className={`mt-1.25 size-2 shrink-0 rounded-full ${dotColor(r)}`} />
        <span className="min-w-0 pr-5">
          <span
            className={`line-clamp-2 text-[13px] leading-snug font-medium ${
              active ? "text-accent-press" : "text-ink"
            }`}
          >
            {r.pr.title}
          </span>
          <span className="mt-1 block truncate font-mono text-[11px] text-ink-2">
            {r.repo.name ?? r.repo.path} · #{r.pr.number}
          </span>
          <span className="mt-0.5 block font-mono text-[11px] text-ink-3">
            {regions} region{regions === 1 ? "" : "s"} explained
          </span>
        </span>
      </button>
      <button
        type="button"
        aria-label="Remove analysis"
        onClick={() => onRemove(entry.key)}
        className="absolute top-1.5 right-1.5 grid size-6 cursor-pointer place-items-center rounded-md text-ink-3 opacity-0 transition-[opacity,color,background-color] group-hover:opacity-100 hover:bg-line-2/70 hover:text-ink focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
      >
        <Close className="size-3.5" />
      </button>
    </div>
  );
}

export function PrSidebar({
  entries,
  activeKey,
  onSelect,
  onRemove,
  user,
}: {
  entries: PrEntry[];
  activeKey: string | null;
  onSelect: (key: string) => void;
  onRemove: (key: string) => void;
  user: AuthUser | null;
}) {
  return (
    <aside
      aria-label="Explained pull requests"
      className="hidden w-67 shrink-0 flex-col border-r border-line-2 bg-surface-2 md:flex"
    >
      <div className="flex items-center gap-2 px-4 py-4">
        <span className="text-[11px] font-semibold tracking-[0.07em] text-ink-2 uppercase">
          Pull requests
        </span>
        <span className="ml-auto text-[11px] font-semibold text-ink-3 tnum">{entries.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 pb-4">
        {entries.length === 0 ? (
          <div className="mt-8 flex flex-col items-center px-4 text-center">
            <span className="grid size-11 place-items-center rounded-full border border-line bg-surface text-ink-3 shadow-card">
              <PullRequest className="size-4.5" />
            </span>
            <p className="mt-3 text-[13px] font-semibold text-ink-2">No pull requests yet</p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-3">
              Paste a PR above and explain it — each analysis files itself here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {entries.map((e) => (
              <Row
                key={e.key}
                entry={e}
                active={e.key === activeKey}
                onSelect={onSelect}
                onRemove={onRemove}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2.5 border-t border-line px-4 py-3">
        {user ? (
          <>
            <Avatar name={user.name} src={user.avatarUrl} size={26} />
            <span className="min-w-0 text-[12.5px] leading-tight font-semibold">
              <span className="block truncate">{user.name}</span>
              <span className="block truncate font-mono text-[11px] font-normal text-ink-3">
                @{user.login}
              </span>
            </span>
          </>
        ) : (
          <>
            <span className="grid size-6.5 place-items-center rounded-full border border-line-2 bg-inset text-ink-3">
              <User className="size-3.5" />
            </span>
            <span className="text-[12.5px] leading-tight font-semibold text-ink-2">
              Guest
              <span className="block text-[11px] font-normal text-ink-3">Not signed in</span>
            </span>
          </>
        )}
      </div>
    </aside>
  );
}
