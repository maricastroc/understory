export function PreviewBar({
  repo,
  path,
  line,
  question,
}: {
  repo: string;
  path: string;
  line: number;
  question: string;
}) {
  return (
    <div className="flex min-h-10 flex-wrap items-center gap-x-4 gap-y-1 border-b border-li-divider bg-li-neutral-100 px-4 py-2">
      <p className="flex min-w-0 items-baseline gap-2 font-li-mono text-xs">
        <span className="shrink-0 whitespace-nowrap text-li-neutral-700 max-[640px]:hidden">
          {repo} /
        </span>
        <span className="truncate text-li-ink">{path}</span>
        <span className="shrink-0 text-li-datum-ink">line {line}</span>
      </p>
      <p className="ml-auto text-[13px] font-medium text-li-ink max-[640px]:ml-0">{question}</p>
    </div>
  );
}
