import type { DiffResult } from "@git-investigator/core/diff/types";
import { Alert, Clock, ExternalLink, Search } from "../icons";
import { SectionLabel } from "../ui";
import { FindingCard } from "./FindingCard";
import { prMetrics } from "./pr-metrics";

function MethodBanner({ result }: { result: DiffResult }) {
  const m = prMetrics(result);
  const gathered = m.pullRequests + m.reviews + m.issues;
  const acts = [
    `reconstructed ${m.originCommits} origin commit${m.originCommits === 1 ? "" : "s"} behind the changed code`,
    gathered > 0
      ? `gathered ${gathered} upstream source${gathered === 1 ? "" : "s"}`
      : "found no upstream pull requests, reviews, or issues",
    `explained ${m.regionsExplained} of ${result.triage.clustersDetailed} region${
      result.triage.clustersDetailed === 1 ? "" : "s"
    } from the record`,
  ];
  return (
    <div className="flex items-start gap-2.5 rounded-[10px] border border-line bg-surface-2 px-4 py-3">
      <Search className="mt-0.5 size-4 shrink-0 text-accent-press" />
      <p className="text-[12.5px] leading-relaxed text-ink-2">
        <span className="font-semibold text-ink">
          The same investigation as Explain a line — why does this code exist?
        </span>{" "}
        Blaming the code this pull request touches against the base commit, it {acts.join(", ")} —
        and abstains where the recorded history is silent.
        {result.triage.truncated && " Regions with the richest recorded history come first."}
      </p>
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
        <MethodBanner result={result} />
      </div>

      {result.error && (
        <div className="flex items-start gap-2 rounded-[10px] border border-warn/30 bg-warn-tint p-4 text-[13px] text-warn">
          <Alert className="mt-0.5 size-4 shrink-0" />
          <span>{result.error}</span>
        </div>
      )}

      {result.summary && (
        <section>
          <SectionLabel
            title="Why the changed code exists"
            meta="narrative overview — not citation-checked; the cited, verified findings are region by region below"
          />
          <div className="flex items-start gap-3 rounded-[10px] border border-accent/25 bg-accent-tint/50 p-5 shadow-card">
            <Clock className="mt-0.5 size-5 shrink-0 text-accent-press" />
            <div className="flex flex-col gap-2.5">
              <p className="max-w-[72ch] text-[15px] leading-relaxed text-[#2a2d36]">
                {result.summary}
              </p>
              <p className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-3">
                <Alert className="size-3.5 shrink-0" />
                Overview only — not citation-checked. Each region below is traced to cited,
                verified sources.
              </p>
            </div>
          </div>
        </section>
      )}

      <section>
        <SectionLabel
          title="Reconstructed history, region by region"
          meta="each region traced back to why the existing code was there — richest history first"
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
