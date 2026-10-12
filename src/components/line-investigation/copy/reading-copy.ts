import type { Reading } from "@understory/core/types";
import type { ChangeFact, PassageScope } from "../history/reading-layer";

export function factText(fact: ChangeFact): string {
  if (fact.did === "added") return "added this line";
  if (fact.did === "respaced") return "changed only the spacing of this line";
  return "rewrote this line";
}

const SCOPE: Record<PassageScope["scope"], string> = {
  line: "tied to this line",
  change: "said of the change as a whole",
  "earlier change": "said of an earlier change to this line",
  file: "from the file's history, not this line's",
};

const PLACE: Record<NonNullable<PassageScope["placement"]>, string> = {
  "on the line": "comment made on this line",
  "in its hunk": "comment made near this line",
  "same file, elsewhere": "comment made elsewhere in this file",
  "another file": "comment made in another file",
};

export function scopeText(scope: PassageScope): string {
  const place = scope.placement
    ? `${PLACE[scope.placement]}${scope.outdated && scope.placement !== "another file" ? ", on an earlier version" : ""}`
    : null;
  return [SCOPE[scope.scope], place].filter(Boolean).join(" · ");
}

export const EARLIER_CAPTION = "found by following the line back · not read for a reason";

export function edgeText(edge: Reading["earlier"], history: Reading["history"]): string | null {
  if (history === "the file")
    return "These are changes to the file. The line's own history could not be read.";
  if (edge === null) return null;
  if (edge === "not read") return "The line's history before this was not read.";
  const why: Record<
    Exclude<NonNullable<Reading["earlier"]>, "not read" | "the line was added">,
    string
  > = {
    "depth limit": "it goes further back than this view follows",
    "request limit": "it goes further back than this view follows",
    "time limit": "following it took too long",
    "no patch": "the host did not return the change",
    "line not located": "the line could not be followed through the change",
    quota: "the host's request allowance was low",
    cancelled: "the investigation was cancelled",
  };
  return edge === "the line was added"
    ? null
    : `The line's history before this was not read: ${why[edge]}.`;
}
