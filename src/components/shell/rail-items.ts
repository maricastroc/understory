import type { Messages } from "@/i18n/messages";
import { basename } from "../format";
import { isDefaultQuestion } from "../investigator/default-question";
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

function statusSuffix(view: InvestigationView, m: Messages): string | null {
  if (view.verdict === "pending") return `${m.shell.status.pending}…`;
  if (view.verdict !== "resolved") return m.shell.status[STATUS[view.verdict]];
  const links = view.links;
  if (!links || !view.location || links.filled + links.gaps === 0) return null;
  return links.unverified === 0
    ? m.shell.linksOf(links.filled, links.filled + links.gaps)
    : m.shell.links(links.filled);
}

function caseTitle(entry: Entry, m: Messages): string {
  const question = entry.form.question || entry.result.evidence.question || "";
  const loc = entry.result.evidence.location;
  if (loc && isDefaultQuestion(question))
    return m.shell.caseTitle(loc.startLine, loc.endLine, basename(loc.file));
  return question || m.shell.noQuestion;
}

function lineSubline(
  entry: Entry,
  view: InvestigationView,
  parent: InvestigationView | null,
  m: Messages,
): string {
  const ev = entry.result.evidence;
  const anchor = ev.anchor;
  if (!ev.location && anchor && parent) {
    const source = parent.artifacts.find((a) => a.id === anchor.id);
    return m.shell.from(
      source ? `${source.letter} · ${displayId(source)}` : (anchor.ref ?? anchor.id),
    );
  }
  const where = ev.location
    ? `${basename(ev.location.file)}:${
        ev.location.startLine === ev.location.endLine
          ? ev.location.startLine
          : `${ev.location.startLine}-${ev.location.endLine}`
      }`
    : (anchor?.ref ?? anchor?.id ?? "—");
  const suffix = statusSuffix(view, m);
  return suffix ? `${where} · ${suffix}` : where;
}

export function lineRailItems(
  entries: Entry[],
  opts: { activeId: string | null; now: number; m: Messages },
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
      title: caseTitle(e, opts.m),
      subline: lineSubline(e, view, parent, opts.m),
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
