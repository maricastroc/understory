import type { PlacedComment } from "../../types";
import { ACTOR, type Actor, isBot } from "./bots";

export type Comment = {
  author: Actor;
  body: string;
  createdAt: string;
  path?: string | null;
  outdated?: boolean | null;
  diffHunk?: string | null;
  line?: number | null;
};

export const COMMENTS = `comments(first: 8) { nodes { ${ACTOR} body createdAt } }`;

export const REVIEW_COMMENTS = `comments(first: 8) { nodes { ${ACTOR} body createdAt path outdated diffHunk line } }`;

const MAX_COMMENTS = 8;
const MAX_PLACED_BODY = 800;
const MAX_HUNK_ROWS = 8;
const MAX_HUNK_CHARS = 800;

function hunkTail(diffHunk: string): string {
  const rows = diffHunk.replace(/\r\n/g, "\n").split("\n");
  return rows.slice(-MAX_HUNK_ROWS).join("\n").slice(-MAX_HUNK_CHARS);
}

export function placedComments(comments: Comment[]): PlacedComment[] {
  return comments
    .filter((c) => c.body?.trim() && !isBot(c.author))
    .slice(0, MAX_COMMENTS)
    .flatMap((c) =>
      typeof c.path === "string" && c.path && typeof c.diffHunk === "string" && c.diffHunk
        ? [
            {
              body: c.body.trim().slice(0, MAX_PLACED_BODY),
              path: c.path,
              diffHunk: hunkTail(c.diffHunk),
              outdated: c.outdated !== false,
              line: typeof c.line === "number" ? c.line : null,
            },
          ]
        : [],
    );
}

export function foldComments(header: string, comments: Comment[]): string {
  const real = comments.filter((c) => c.body?.trim() && !isBot(c.author));
  if (!real.length) return header;
  const digest = real
    .slice(0, MAX_COMMENTS)
    .map((c) => `@${c.author?.login ?? "someone"}: ${c.body.trim()}`)
    .join("\n\n");
  return header ? `${header}\n\n— discussion —\n${digest}` : digest;
}
