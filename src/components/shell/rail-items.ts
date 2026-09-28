import { basename } from "../format";
import type { Entry } from "../investigator/use-investigation";
import { displayId } from "../line-investigation/copy/artifact-copy";
import { buildInvestigationView } from "../line-investigation/model/build-investigation-view";
import type { InvestigationView, Verdict } from "../line-investigation/model/types";
import type { RailItem, RailStatus } from "./types";

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
