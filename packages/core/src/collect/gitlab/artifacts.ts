import type { Artifact } from "../../types";

export type GlCommit = {
  id: string;
  short_id: string;
  title: string;
  message: string;
  committed_date: string;
  web_url: string;
  author_name: string | null;
  author_email: string | null;
};

export type GlMr = {
  iid: number;
  title: string;
  description: string | null;
  web_url: string;
  created_at: string;
  state?: string;
  merged_at?: string | null;
};

export type GlIssue = {
  iid: number;
  title: string;
  description: string | null;
  web_url: string;
  created_at: string;
  state?: string;
};

export type GlNote = {
  author: { username: string } | null;
  body: string;
  created_at: string;
  system?: boolean;
};

export function glCommitArtifact(c: GlCommit): Artifact {
  return {
    id: `commit:${c.short_id}`,
    kind: "commit",
    title: c.title,
    body: c.message?.trim() || c.title,
    url: c.web_url,
    date: c.committed_date,
    author: c.author_name ? { name: c.author_name, email: c.author_email ?? undefined } : undefined,
    ref: c.short_id,
    meta: { sha: c.id },
  };
}

export function glMrArtifact(mr: GlMr, parentId?: string): Artifact {
  const desc = mr.description?.trim();
  return {
    id: `pr:${mr.iid}`,
    kind: "pull_request",
    title: mr.title,
    body: desc ? `${mr.title}\n\n${desc}` : mr.title,
    url: mr.web_url,
    date: mr.created_at,
    ref: `!${mr.iid}`,
    parentId,
    ...(mr.merged_at ? { meta: { mergedAt: mr.merged_at } } : {}),
  };
}

export function glIssueArtifact(iss: GlIssue, parentId?: string): Artifact {
  const desc = iss.description?.trim();
  const meta = iss.state ? { state: iss.state } : undefined;
  return {
    id: `issue:${iss.iid}`,
    kind: "issue",
    title: iss.title,
    body: desc ? `${iss.title}\n\n${desc}` : iss.title,
    url: iss.web_url,
    date: iss.created_at,
    ref: `#${iss.iid}`,
    parentId,
    ...(meta ? { meta } : {}),
  };
}

export function glReviewArtifact(
  mrIid: number,
  mrUrl: string,
  note: GlNote,
  i: number,
  parentId?: string,
): Artifact {
  const who = note.author?.username ?? "reviewer";
  return {
    id: `review:${mrIid}-${i}`,
    kind: "review",
    title: `Note by ${who} on !${mrIid}`,
    body: note.body.trim(),
    url: mrUrl,
    date: note.created_at,
    author: { name: who },
    ref: `!${mrIid}`,
    parentId,
  };
}
