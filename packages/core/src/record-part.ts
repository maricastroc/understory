import { locateQuote } from "./quote";
import type { Artifact, RecordPart } from "./types";

export const DISCUSSION = "\n\n— discussion —\n";

export const FOLDED_COMMENT = /^@[\w-]+: /;

export type Segment = { part: RecordPart; start: number; end: number };

export function segmentsOf(source: Pick<Artifact, "kind" | "body">): Segment[] {
  const { kind, body } = source;
  const marker = body.indexOf(DISCUSSION);
  const header = marker < 0 ? body.length : marker;
  const thread = marker < 0 ? body.length : marker + DISCUSSION.length;
  if (kind === "review")
    return marker < 0
      ? [
          {
            part: FOLDED_COMMENT.test(body) ? "review comment" : "review summary",
            start: 0,
            end: body.length,
          },
        ]
      : [
          { part: "review summary", start: 0, end: header },
          { part: "review comment", start: thread, end: body.length },
        ];
  const firstBreak = body.indexOf("\n");
  const title = firstBreak < 0 ? header : Math.min(firstBreak, header);
  const all: Segment[] = [
    { part: "title", start: 0, end: title },
    { part: kind === "commit" ? "message" : "description", start: title, end: header },
    { part: "discussion", start: thread, end: body.length },
  ];
  return all.filter((segment) => body.slice(segment.start, segment.end).trim() !== "");
}

export function partsOf(source: Pick<Artifact, "kind" | "body">, quote: string): RecordPart[] {
  const range = locateQuote(source.body, quote);
  if (!range) return [];
  return segmentsOf(source)
    .filter((segment) => segment.start < range.end && range.start < segment.end)
    .map((segment) => segment.part);
}
