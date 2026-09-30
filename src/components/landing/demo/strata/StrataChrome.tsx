import { HATCH } from "./strata-hatch";

export function StrataMark() {
  return (
    <span aria-hidden className="relative h-5 w-5.5 shrink-0">
      <span className="absolute top-0.5 left-0 h-0.75 w-5.5 bg-strata-bore" />
      <span className="absolute top-1.25 left-2.5 h-2.25 w-0.5 bg-strata-ink" />
      <span className="absolute top-2.75 left-1.75 size-1.75 rotate-45 bg-strata-ink" />
    </span>
  );
}

export function StrataTopBar({
  repo,
  path,
  line,
  summary,
  wide,
}: {
  repo: string;
  path: string;
  line: number;
  summary: string;
  wide: boolean;
}) {
  return (
    <div
      className={`flex items-center border-b border-strata-divider font-li-mono text-xs text-strata-neutral-700 ${
        wide ? "h-11 gap-3.5 px-10" : "flex-wrap gap-x-3 gap-y-1 px-4 py-2.5"
      }`}
    >
      <span className="flex items-center gap-3.5">
        <StrataMark />
        <span className="font-li-body text-[17px] font-semibold text-strata-ink">Understory</span>
        {wide && <span>code archaeology</span>}
      </span>
      <span className={`min-w-0 ${wide ? "ml-12" : "basis-full"}`}>
        {repo} / <span className="text-strata-ink">{path}</span>{" "}
        <span className="text-strata-bore-ink">line {line}</span>
      </span>
      <span className={wide ? "ml-auto" : "basis-full"}>{summary}</span>
    </div>
  );
}

export function StrataLegend({ origin, wide }: { origin: string | null; wide: boolean }) {
  return (
    <div
      aria-hidden
      className={`flex items-center font-li-mono text-[11px] text-strata-neutral-700 ${
        wide ? "h-full gap-6 px-10" : "flex-wrap gap-x-5 gap-y-2 px-4 py-3"
      }`}
    >
      <span className={`text-strata-ink ${wide ? "" : "basis-full"}`}>
        depth = time · the bore follows the token down
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 bg-strata-ink" />
        cited
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 border border-strata-ink" />
        context
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 bg-strata-trace" />
        verified trace
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className="h-2.5 w-3.5 border border-dashed border-strata-neutral-600"
          style={{ background: HATCH.dense }}
        />
        silent record
      </span>
      {origin && <span className={wide ? "ml-auto" : "basis-full"}>{origin}</span>}
    </div>
  );
}
