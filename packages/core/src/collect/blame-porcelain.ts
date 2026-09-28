import type { BlameSpan } from "../types";

const HEADER = /^([0-9a-f]{40}) \d+ (\d+)(?: \d+)?$/;
const UNCOMMITTED = /^0{40}$/;

type CommitInfo = { author?: string; time?: number };

export function parseBlamePorcelain(text: string): BlameSpan[] {
  const info = new Map<string, CommitInfo>();
  const owners: Array<{ line: number; sha: string }> = [];
  let current: { sha: string; line: number } | null = null;

  for (const raw of text.split("\n")) {
    if (raw.startsWith("\t")) {
      if (current) owners.push(current);
      current = null;
      continue;
    }
    const head = raw.match(HEADER);
    if (head) {
      current = { sha: head[1], line: Number(head[2]) };
      if (!info.has(head[1])) info.set(head[1], {});
      continue;
    }
    if (!current) continue;
    const entry = info.get(current.sha)!;
    if (raw.startsWith("author ")) entry.author = raw.slice("author ".length);
    else if (raw.startsWith("committer-time ")) entry.time = Number(raw.slice(15));
  }

  const spans: BlameSpan[] = [];
  for (const { line, sha } of owners.sort((a, b) => a.line - b.line)) {
    if (UNCOMMITTED.test(sha)) continue;
    const last = spans[spans.length - 1];
    if (last && last.sha === sha && last.endLine === line - 1) {
      last.endLine = line;
      continue;
    }
    const meta = info.get(sha) ?? {};
    spans.push({
      startLine: line,
      endLine: line,
      sha,
      shortSha: sha.slice(0, 7),
      date: meta.time !== undefined ? new Date(meta.time * 1000).toISOString() : "",
      ...(meta.author ? { author: meta.author } : {}),
    });
  }
  return spans;
}
