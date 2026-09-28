import type { ViewArtifact, ViewClause } from "../model/types";
import { displayId, kindName } from "./artifact-copy";

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function clauseNumber(clause: ViewClause): number {
  return clause.index + 1;
}

export function tallyText(clause: ViewClause): string {
  if (clause.silent) return "no reason on record";
  const known = clause.cells.filter((c) => c.state !== "unknown").length;
  const unknown = clause.cells.length - known;
  const parts = [plural(known, "source")];
  const verified = clause.cells.filter((c) => c.state === "verified").length;
  if (clause.audit === "supported") parts.push(`${verified} verified`);
  if (clause.audit === "weak") parts.push("weak support");
  if (clause.audit === "unsupported") parts.push("not substantiated");
  if (clause.audit === "unaudited") parts.push("not audited");
  if (unknown > 0) parts.push(`${unknown} not collected`);
  return parts.join(" · ");
}

export function clauseDescription(clause: ViewClause, byId: Map<string, ViewArtifact>): string {
  if (clause.silent) return "Not recorded. No source explains this.";
  const sources = clause.citations
    .map((id) => byId.get(id))
    .filter((a): a is ViewArtifact => !!a)
    .map((a) => `${a.letter}, ${kindName(a.kind)} ${displayId(a)}`);
  const parts = [sources.length ? `Supported by ${sources.join("; ")}.` : "No collected source."];
  const verified = clause.cells.filter((c) => c.state === "verified").length;
  if (clause.audit === "supported") {
    parts.push(verified ? `${plural(verified, "quote")} verified.` : "No verbatim quote.");
  }
  if (clause.audit === "weak") parts.push("Sources are on topic but no line proves it.");
  if (clause.audit === "unsupported") parts.push("The cited sources do not substantiate it.");
  if (clause.audit === "unaudited") parts.push("Not audited.");
  if (clause.unknownCitations.length) {
    parts.push(`Cites ${clause.unknownCitations.join(", ")}, which was never collected.`);
  }
  return parts.join(" ");
}
