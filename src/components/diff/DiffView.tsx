import type { DiffResult } from "@git-investigator/core/diff/types";
import { Alert, ExternalLink, Shield } from "../icons";
import { SectionLabel } from "../ui";
import { FindingCard } from "./FindingCard";

function Triage({ result }: { result: DiffResult }) {
  const t = result.triage;
  const bits = [
    `${t.filesChanged} file${t.filesChanged === 1 ? "" : "s"} changed`,
    `${t.filesConsidered} with history`,
    `${t.clustersDetailed} region${t.clustersDetailed === 1 ? "" : "s"} explained`,
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-2">
      {bits.map((b, i) => (
        <span key={b} className="inline-flex items-center gap-3">
          {i > 0 && <span className="size-0.75 rounded-full bg-line-2" />}
          {b}
        </span>
      ))}
      {t.truncated && (
        <span className="text-ink-3">· busiest changes shown first; some trimmed</span>
      )}
    </div>
  );
}

export function DiffView({ result }: { result: DiffResult }) {
  const repoName = result.repo.name ?? result.repo.path;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-ink-2">
          <span className="font-mono">{repoName}</span>
          <span className="text-ink-3">/</span>
          <span className="font-mono">#{result.pr.number}</span>
          <a
            href={result.pr.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-accent-press hover:underline"
          >
            open on GitHub <ExternalLink className="size-3" />
          </a>
        </div>
        <h1 className="max-w-[32ch] text-[26px] leading-[1.2] font-semibold tracking-tight text-balance">
          {result.pr.title}
        </h1>
        <Triage result={result} />
      </div>

      {result.error && (
        <div className="flex items-start gap-2 rounded-[10px] border border-warn/30 bg-warn-tint p-4 text-[13px] text-warn">
          <Alert className="mt-0.5 size-4 shrink-0" />
          <span>{result.error}</span>
        </div>
      )}

      {result.summary && (
        <section>
          <SectionLabel title="What to know before you approve" />
          <div className="flex items-start gap-3 rounded-[10px] border border-accent/25 bg-accent-tint/50 p-5 shadow-card">
            <Shield className="mt-0.5 size-5 shrink-0 text-accent-press" />
            <p className="max-w-[72ch] text-[15px] leading-relaxed text-[#2a2d36]">{result.summary}</p>
          </div>
        </section>
      )}

      <section>
        <SectionLabel
          title="Changed code, explained"
          meta="Each region traces to why the existing code was there — riskiest first"
        />
        {result.findings.length > 0 ? (
          <div className="flex flex-col gap-3.5">
            {result.findings.map((f, i) => (
              <FindingCard key={f.ref} finding={f} index={i} />
            ))}
          </div>
        ) : (
          <div className="rounded-[10px] border border-line bg-surface p-5 text-[13.5px] text-ink-2">
            {result.note ??
              "No changed code with recorded history in this pull request — it's all new code, or the changes don't trace back to explained commits."}
          </div>
        )}
      </section>
    </div>
  );
}
