import { HistoryPanel, type HistoryPanelProps } from "./HistoryPanel";

export function HistorySidebar({ ariaLabel, ...panel }: HistoryPanelProps & { ariaLabel: string }) {
  return (
    <aside
      aria-label={ariaLabel}
      className="hidden w-67 shrink-0 flex-col border-r border-line-2 bg-surface-2 md:flex"
    >
      <HistoryPanel {...panel} />
    </aside>
  );
}
