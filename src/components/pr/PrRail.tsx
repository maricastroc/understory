import type { DiffResult } from "@git-investigator/core/diff/types";
import { prMetrics } from "../diff/pr-metrics";
import { ExternalLink, PullRequest, Search } from "../icons";
import { MetaRow, RailCard } from "../rail/RailCard";

function Count({ n }: { n: number }) {
  return <span className={`tnum ${n === 0 ? "text-ink-3" : ""}`}>{n}</span>;
}

function PrRailContent({ result }: { result: DiffResult }) {
  const m = prMetrics(result);

  return (
    <>
      <RailCard icon={<PullRequest className="size-3.75" />} title="Pull request">
        <div className="flex items-baseline gap-1.5 text-[14px] font-semibold tracking-tight">
          <span className="min-w-0 truncate font-mono">{result.repo.name ?? result.repo.path}</span>
          <span className="shrink-0 text-ink-3">#{result.pr.number}</span>
        </div>
        <p className="mt-2 line-clamp-3 text-[12.5px] leading-relaxed text-ink-2">
          {result.pr.title}
        </p>
        {result.pr.url && (
          <div className="mt-3">
            <MetaRow
              k="Source"
              v={
                <a
                  href={result.pr.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-accent-press hover:underline"
                >
                  open on GitHub <ExternalLink className="size-3" />
                </a>
              }
            />
          </div>
        )}
      </RailCard>

      <RailCard icon={<Search className="size-3.75" />} title="Investigation">
        <MetaRow k="Files changed" v={<Count n={m.filesChanged} />} />
        <MetaRow k="Files with history" v={<Count n={m.filesWithHistory} />} />
        <MetaRow
          k="Regions explained"
          v={
            <span className="tnum">
              {m.regionsExplained}
              <span className="text-ink-3"> / {result.triage.clustersDetailed}</span>
            </span>
          }
        />
        <MetaRow k="Origin commits" v={<Count n={m.originCommits} />} />
        <MetaRow k="Pull requests" v={<Count n={m.pullRequests} />} />
        <MetaRow k="Reviews" v={<Count n={m.reviews} />} />
        <MetaRow k="Issues" v={<Count n={m.issues} />} />
      </RailCard>

      <div className="rounded-[10px] border border-dashed border-line-2 bg-surface px-4 py-3 text-[12px] leading-relaxed text-ink-3">
        Every region links back to the commit, PR, review, or issue that explains why the existing
        code was there.
      </div>
    </>
  );
}

function Placeholder() {
  return (
    <div className="rounded-[10px] border border-dashed border-line-2 bg-surface p-5 text-[12.5px] leading-relaxed text-ink-3">
      Paste a pull request above — the reconstructed history behind the code it changes, region by
      region, appears here once it runs.
    </div>
  );
}

export function PrRail({ result }: { result: DiffResult | null }) {
  return (
    <aside
      aria-label="Pull request details"
      className="hidden w-71 shrink-0 overflow-y-auto border-l border-line-2 bg-surface-2 xl:block"
    >
      <div className="flex flex-col gap-3.5 p-4.5 pb-10">
        {result ? <PrRailContent result={result} /> : <Placeholder />}
      </div>
    </aside>
  );
}
