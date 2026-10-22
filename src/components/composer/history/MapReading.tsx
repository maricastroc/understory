import { formatNumber, shortAge } from "@/i18n/format";
import { useLocale, useMessages } from "@/i18n/LocaleProvider";
import { BlueprintCorners } from "../../line-investigation/parts/BlueprintCorners";
import { liButton } from "../../line-investigation/parts/button-class";
import { DomainIcon } from "../../line-investigation/parts/DomainIcon";
import { HATCH } from "../../line-investigation/parts/hatch";
import { statusFacts } from "./core-copy";
import type { MapSummary } from "./map-summary";
import { whyShown } from "./scope-copy";
import { historyShares } from "./share-copy";
import type { CoreHistory, CoreStatus, MapCore } from "./types";

function ShareBar({ view }: { view: CoreHistory }) {
  const total = view.shares.found + view.shares.none + view.shares.unknown || 1;
  const w = (n: number) => `${(100 * n) / total}%`;
  return (
    <span aria-hidden className="flex h-2.5 gap-px">
      {view.shares.found > 0 && (
        <span
          className="border border-li-evidence-edge bg-li-evidence-tint"
          style={{ width: w(view.shares.found) }}
        />
      )}
      {view.shares.none > 0 && (
        <span
          className="border border-dashed border-li-gap"
          style={{ width: w(view.shares.none), background: HATCH }}
        />
      )}
      {view.shares.unknown > 0 && (
        <span className="border border-li-neutral-500" style={{ width: w(view.shares.unknown) }} />
      )}
    </span>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-li-neutral-800">{label}</dt>
      <dd className="font-li-mono text-li-ink">{children}</dd>
    </>
  );
}

export function MapReading({
  summary,
  focused,
  view,
  status,
  recentCommits,
  prUnavailable,
  onOpen,
}: {
  summary: MapSummary;
  focused: MapCore | null;
  view: CoreHistory | null;
  status: CoreStatus;
  recentCommits: number;
  prUnavailable: boolean;
  onOpen: (path: string) => void;
}) {
  const locale = useLocale();
  const m = useMessages();
  const r = m.map;
  if (!focused) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-[20px] leading-tight font-semibold text-li-ink">
          {r.files(summary.files)}
          {summary.lines > 0 && (
            <span className="font-li-mono text-[13px] font-normal text-li-neutral-800">
              {" "}
              · {r.currentLines(formatNumber(locale, summary.lines))}
              {summary.mapped < summary.files ? ` ${r.soFar}` : ""}
            </span>
          )}
        </p>
        <p className="text-[13.5px] text-li-neutral-800">{r.hoverHint}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      <p className="flex items-center gap-2 font-li-mono text-[15px] text-li-ink">
        <DomainIcon kind="file" />
        <span className="min-w-0 truncate">
          <span className="text-li-text-subtle">{focused.dir}</span>
          {focused.name}
        </span>
      </p>
      {view ? (
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-1.5 border-t border-li-divider pt-3 text-[13.5px]">
          <Row label={r.rows.lines}>{formatNumber(locale, view.lines)}</Row>
          <Row label={r.rows.oldest}>
            {r.beforeHead(`${view.cut ? "≥ " : ""}${shortAge(m.time, view.oldestDays)}`)}
          </Row>
          <Row label={r.rows.commits}>{view.commits}</Row>
          <Row label={r.rows.prs}>
            {prUnavailable ? (
              <span className="font-li-body text-li-neutral-800">{r.prUnavailable}</span>
            ) : (
              <span className="flex flex-col gap-1.5 pt-1">
                <ShareBar view={view} />
                <span className="text-[12px]">{historyShares(view, locale)}</span>
              </span>
            )}
          </Row>
        </dl>
      ) : (
        <p className="border-t border-li-divider pt-3 text-[13.5px] text-li-neutral-800">
          {statusFacts(status, locale)}
        </p>
      )}
      <p className="text-[12.5px] text-li-text-subtle">
        {whyShown(focused.reason, recentCommits, locale)}
        {view ? ` ${r.movedLines}` : ""}
      </p>
      <button
        type="button"
        onClick={() => onOpen(focused.path)}
        className={liButton("primary", "w-fit")}
      >
        <BlueprintCorners />
        {r.open(focused.name)}
      </button>
    </div>
  );
}
