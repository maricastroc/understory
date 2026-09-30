import type { ArtifactRef } from "@understory/core/types";
import { shortAge } from "../format/age";
import type { InvestigationView, ViewArtifact } from "../model/types";
import { displayId, kindName } from "./artifact-copy";
import type { CaseSubject } from "./types";

export function caseSubject(
  view: Pick<InvestigationView, "location" | "artifacts">,
  anchor: ArtifactRef | undefined,
): CaseSubject {
  const loc = view.location;
  if (loc) {
    return {
      kind: "line",
      label:
        loc.startLine === loc.endLine
          ? `line ${loc.startLine}`
          : `lines ${loc.startLine}–${loc.endLine}`,
    };
  }
  if (anchor) {
    const found = view.artifacts.find((a) => a.id === anchor.id);
    const ref = found ? displayId(found) : (anchor.ref ?? anchor.id);
    const noun = kindName(anchor.kind);
    return {
      kind: "anchor",
      label: anchor.kind === "commit" ? `${noun} ${ref}` : ref,
      id: anchor.id,
      artifact: anchor.kind,
      noun,
      ref,
    };
  }
  return { kind: "line", label: "the file" };
}

export function historyTitle(s: CaseSubject): string {
  return s.kind === "line" ? `History of ${s.label}` : `Around ${s.label}`;
}

export function surfaceText(s: CaseSubject): string {
  return s.kind === "line" ? `${s.label} · as it reads now` : "today";
}

export function breakText(s: CaseSubject, days: number, first: boolean): string {
  const age = shortAge(days);
  if (s.kind === "anchor") return first ? `${age} before today` : `${age} between these`;
  return first ? `unchanged for ${age}` : `${age} with no change to ${s.label}`;
}

export function breakMargin(s: CaseSubject, first: boolean): string {
  if (s.kind === "anchor") return first ? "before today" : "between";
  return first ? "unchanged" : "no change";
}

export function originText(s: CaseSubject): string {
  return s.kind === "line" ? `oldest recorded change to ${s.label}` : "earliest artifact collected";
}

const ASKED: Record<string, string> = {
  commit: "the change this case asks about",
  pull_request: "the pull request this case asks about",
  review: "the review this case asks about",
  issue: "the issue this case asks about",
};

export function subjectCaption(s: CaseSubject, a: ViewArtifact, current: boolean): string | null {
  if (s.kind === "anchor") return a.id === s.id ? ASKED[a.kind] : null;
  return current && a.kind === "commit" ? `wrote ${s.label} as it reads today` : null;
}

export function commitRole(
  commit: ViewArtifact | null,
  current: ViewArtifact | null,
  s: CaseSubject,
): string | null {
  if (!commit) return null;
  if (s.kind === "anchor") return commit.id === s.id ? ASKED.commit : null;
  return commit.id === current?.id
    ? `wrote ${s.label} as it reads today`
    : `an earlier change to ${s.label}`;
}
