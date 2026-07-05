import { Evidence } from "../Evidence";
import { Findings } from "../Findings";
import { basename, levelLabel } from "../format";
import { Alert, Branch, ChevronLeft, FileIcon } from "../icons";
import { Timeline } from "../Timeline";
import { Pill } from "../ui";
import type { Entry } from "./use-investigation";

export function CaseView({ entry, onBack }: { entry: Entry; onBack: () => void }) {
  const { result, caseId, form } = entry;
  const ev = result.evidence;
  const narrative = result.narrative;
  const citedIds = new Set(narrative?.citations ?? []);
  const repoName = ev.repo.name ?? basename(ev.repo.path);
  const loc = `${ev.location.file}:${ev.location.startLine}${
    ev.location.endLine !== ev.location.startLine ? `-${ev.location.endLine}` : ""
  }`;

  const outOfScope = narrative?.answerable === false;
  const status = !narrative
    ? { tone: "neutral" as const, label: "Evidence only" }
    : outOfScope
      ? { tone: "neutral" as const, label: "Out of scope" }
      : narrative.recorded
        ? { tone: "good" as const, label: "Concluded" }
        : { tone: "warn" as const, label: "Inconclusive" };

  return (
    <>
      <button
        onClick={onBack}
        className="mb-4 inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-accent/25 bg-accent-tint px-3 text-[13px] font-medium text-accent-press shadow-sm transition-colors hover:bg-accent hover:text-white"
      >
        <ChevronLeft className="size-3.5" />
        Back to code
      </button>

      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-ink-2">
          <span className="font-mono">{repoName}</span>
          <span className="text-ink-3">/</span>
          <span className="font-mono">{caseId}</span>
          <Pill tone={status.tone} dot={status.tone !== "neutral"}>
            {status.label}
          </Pill>
        </div>

        <h1 className="max-w-[26ch] text-[27px] leading-[1.22] font-semibold tracking-tight text-balance">
          {form.question || "Why is this line the way it is?"}
        </h1>

        {/* Location, branch and exhibits are plain metadata — only confidence stays a chip. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-ink-2">
          <span className="inline-flex items-center gap-1.5">
            <FileIcon className="size-3.5 text-ink-3" />
            <span className="font-mono text-ink">{loc}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Branch className="size-3.5 text-ink-3" />
            branch <b className="font-medium text-ink">{ev.repo.branch ?? "—"}</b>
          </span>
          <span>
            {ev.artifacts.length} exhibit{ev.artifacts.length !== 1 ? "s" : ""}
          </span>
          {narrative && !outOfScope && (
            <Pill tone={status.tone} dot={status.tone !== "neutral"}>
              {levelLabel[narrative.confidence.level]} confidence ·{" "}
              <span className="tnum">{Math.round(narrative.confidence.score * 100)}%</span>
            </Pill>
          )}
        </div>
      </div>

      {narrative ? (
        <Findings evidence={ev} narrative={narrative} />
      ) : (
        <div className="mt-6 flex items-start gap-2 rounded-[10px] border border-warn/30 bg-warn-tint p-4 text-[13px] text-warn">
          <Alert className="mt-0.5 size-4 shrink-0" />
          <span>
            {result.error ?? "No conclusion was produced — showing collected evidence only."}
          </span>
        </div>
      )}

      {ev.artifacts.length > 0 && <Timeline artifacts={ev.artifacts} citedIds={citedIds} />}
      {ev.artifacts.length > 0 && <Evidence evidence={ev} citedIds={citedIds} />}
    </>
  );
}
