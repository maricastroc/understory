import { ACTOR, type Actor, isBot } from "./bots";

export type Comment = { author: Actor; body: string; createdAt: string };

export const COMMENTS = `comments(first: 8) { nodes { ${ACTOR} body createdAt } }`;

const MAX_COMMENTS = 8;

export function foldComments(header: string, comments: Comment[]): string {
  const real = comments.filter((c) => c.body?.trim() && !isBot(c.author));
  if (!real.length) return header;
  const digest = real
    .slice(0, MAX_COMMENTS)
    .map((c) => `@${c.author?.login ?? "someone"}: ${c.body.trim()}`)
    .join("\n\n");
  return header ? `${header}\n\n— discussion —\n${digest}` : digest;
}
