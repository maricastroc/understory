export function RailCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[10px] border border-line bg-surface shadow-card">
      <div className="flex items-center gap-2 px-4 pt-3.5 pb-1 text-ink-3">
        {icon}
        <span className="text-[12px] font-semibold text-ink-2">{title}</span>
      </div>
      <div className="px-4 pt-1 pb-4">{children}</div>
    </div>
  );
}

export function MetaRow({
  k,
  v,
  mono,
  tail,
}: {
  k: string;
  v: React.ReactNode;
  mono?: boolean;
  tail?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line/50 py-[7px] text-[12.5px] first:border-t-0">
      <span className="shrink-0 text-ink-2">{k}</span>
      <span
        dir={tail ? "rtl" : undefined}
        title={typeof v === "string" ? v : undefined}
        className={`min-w-0 truncate text-right font-medium text-ink ${mono ? "font-mono text-[12px]" : ""}`}
      >
        {tail ? <bdi>{v}</bdi> : v}
      </span>
    </div>
  );
}
