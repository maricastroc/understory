import { basename } from "../format";
import type { Entry } from "../investigator/use-investigation";
import { displayId } from "../line-investigation/copy/artifact-copy";
import { buildInvestigationView } from "../line-investigation/model/build-investigation-view";
import type { InvestigationView, Verdict } from "../line-investigation/model/types";
import type { PrEntry } from "../pr/pr-entry";
import { deriveRegions } from "../pr-investigation/model/derive-regions";
import type { RailFilter, RailItem, RailStatus } from "./types";

const STATUS: Record<Verdict, RailStatus> = {
  resolved: "resolved",
  "not-recorded": "silent",
  "evidence-only": "evidence-only",
  "out-of-scope": "out-of-scope",
  fabrication: "fabrication",
  pending: "pending",
};

const SUFFIX: Partial<Record<Verdict, string>> = {
  "not-recorded": "not recorded",
  "evidence-only": "evidence only",
  "out-of-scope": "out of scope",
  fabrication: "fabrication caught",
  pending: "reconstructing…",
};

function statusSuffix(view: InvestigationView): string | null {
  if (view.verdict !== "resolved") return SUFFIX[view.verdict] ?? null;
  const links = view.links;
  if (!links || !view.location || links.filled + links.gaps === 0) return null;
  return links.unverified === 0
    ? `${links.filled} of ${links.filled + links.gaps} links`
    : `${links.filled} links`;
}

function lineSubline(
  entry: Entry,
  view: InvestigationView,
  parent: InvestigationView | null,
): string {
  const ev = entry.result.evidence;
  const anchor = ev.anchor;
  if (!ev.location && anchor && parent) {
    const source = parent.artifacts.find((a) => a.id === anchor.id);
    return source
      ? `from ${source.letter} · ${displayId(source)}`
      : `from ${anchor.ref ?? anchor.id}`;
  }
  const where = ev.location
    ? `${basename(ev.location.file)}:${
        ev.location.startLine === ev.location.endLine
          ? ev.location.startLine
          : `${ev.location.startLine}-${ev.location.endLine}`
      }`
    : (anchor?.ref ?? anchor?.id ?? "—");
  const suffix = statusSuffix(view);
  return suffix ? `${where} · ${suffix}` : where;
}

export function lineRailItems(
  entries: Entry[],
  opts: { activeId: string | null; now: number },
): RailItem[] {
  const views = new Map(
    entries.map((e) => [
      e.caseId,
      buildInvestigationView(e.result, { now: opts.now, pending: e.pending ?? false }),
    ]),
  );
  const present = new Set(entries.map((e) => e.caseId));
  const isChild = (e: Entry) => !!e.parentCaseId && present.has(e.parentCaseId);

  const toItem = (e: Entry): RailItem => {
    const view = views.get(e.caseId)!;
    const parent = isChild(e) ? (views.get(e.parentCaseId!) ?? null) : null;
    return {
      id: e.caseId,
      kind: "line",
      title: e.form.question || e.result.evidence.question || "(no question asked)",
      subline: lineSubline(e, view, parent),
      status: STATUS[view.verdict],
      child: isChild(e),
      current: e.caseId === opts.activeId,
      ...(e.parentCaseId ? { parentId: e.parentCaseId } : {}),
    };
  };

  const out: RailItem[] = [];
  for (const root of entries.filter((e) => !isChild(e))) {
    out.push(toItem(root));
    for (const child of entries.filter((e) => isChild(e) && e.parentCaseId === root.caseId)) {
      out.push(toItem(child));
    }
  }
  return out;
}

export function prRailItems(entries: PrEntry[], activeKey: string | null): RailItem[] {
  return entries.map((e) => {
    const regions = deriveRegions(e.result);
    const explained = regions.filter((r) => r.state === "explained").length;
    return {
      id: e.key,
      kind: "pr",
      title: e.result.pr.title,
      subline: `#${e.result.pr.number} · ${explained} of ${regions.length} regions`,
      status: "pr",
      child: false,
      current: e.key === activeKey,
    };
  });
}

export function railFiltersUseful(lines: RailItem[], prs: RailItem[]): boolean {
  return lines.length > 0 && prs.length > 0;
}

export function filterRail(lines: RailItem[], prs: RailItem[], filter: RailFilter): RailItem[] {
  const useful = railFiltersUseful(lines, prs);
  if (useful && filter === "lines") return lines;
  if (useful && filter === "prs") return prs;
  const prIds = new Set(prs.map((p) => p.id));
  const underPr = (item: RailItem) => !!item.parentId && prIds.has(item.parentId);
  return [
    ...lines.filter((l) => !underPr(l)),
    ...prs.flatMap((p) => [
      p,
      ...lines.filter((l) => l.parentId === p.id).map((l) => ({ ...l, child: true })),
    ]),
  ];
}
