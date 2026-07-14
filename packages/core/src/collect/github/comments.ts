export type Comment = { author: { login: string } | null; body: string; createdAt: string };

export const COMMENTS = "comments(first: 8) { nodes { author { login } body createdAt } }";

const MAX_COMMENTS = 8;

export function foldComments(header: string, comments: Comment[]): string {
  const real = comments.filter((c) => c.body?.trim());
  if (!real.length) return header;
  const digest = real
    .slice(0, MAX_COMMENTS)
    .map((c) => `@${c.author?.login ?? "someone"}: ${c.body.trim()}`)
    .join("\n\n");
  return header ? `${header}\n\n— discussion —\n${digest}` : digest;
}
