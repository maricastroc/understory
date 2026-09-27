import type { Artifact } from "../../types";

export type CommitNode = {
  oid: string;
  abbreviatedOid: string;
  messageHeadline: string;
  message: string;
  url: string;
  committedDate: string;
  author: { name: string | null; email: string | null } | null;
};

export type PrNode = {
  number: number;
  title: string;
  body: string;
  url: string;
  createdAt: string;
  mergedAt?: string | null;
};

export type IssueNode = {
  number: number;
  title: string;
  body: string;
  url: string;
  createdAt: string;
  state?: string;
  stateReason?: string | null;
};

export type ReviewNode = {
  author: { login: string } | null;
  state: string;
  body: string;
  submittedAt: string;
};

export function commitArtifact(c: CommitNode): Artifact {
  return {
    id: `commit:${c.abbreviatedOid}`,
    kind: "commit",
    title: c.messageHeadline,
    body: c.message?.trim() || c.messageHeadline,
    url: c.url,
    date: c.committedDate,
    author: c.author?.name
      ? { name: c.author.name, email: c.author.email ?? undefined }
      : undefined,
    ref: c.abbreviatedOid,
    meta: { sha: c.oid },
  };
}

export function prArtifact(pr: PrNode, parentId?: string): Artifact {
  return {
    id: `pr:${pr.number}`,
    kind: "pull_request",
    title: pr.title,
    body: pr.body?.trim() ? `${pr.title}\n\n${pr.body.trim()}` : pr.title,
    url: pr.url,
    date: pr.createdAt,
    ref: `#${pr.number}`,
    parentId,
    ...(pr.mergedAt ? { meta: { mergedAt: pr.mergedAt } } : {}),
  };
}

export function issueArtifact(iss: IssueNode, parentId?: string): Artifact {
  const meta: Record<string, string> = {};
  if (iss.state) meta.state = iss.state;
  if (iss.stateReason) meta.stateReason = iss.stateReason;
  return {
    id: `issue:${iss.number}`,
    kind: "issue",
    title: iss.title,
    body: iss.body?.trim() ? `${iss.title}\n\n${iss.body.trim()}` : iss.title,
    url: iss.url,
    date: iss.createdAt,
    ref: `#${iss.number}`,
    parentId,
    ...(Object.keys(meta).length ? { meta } : {}),
  };
}

export function reviewArtifact(
  prNumber: number,
  prUrl: string,
  rv: ReviewNode,
  i: number,
  parentId?: string,
): Artifact {
  const who = rv.author?.login ?? "reviewer";
  return {
    id: `review:${prNumber}-${i}`,
    kind: "review",
    title: `Review by ${who} on #${prNumber}`,
    body: rv.body.trim(),
    url: prUrl,
    date: rv.submittedAt,
    author: { name: who },
    ref: `#${prNumber}`,
    parentId,
    ...(rv.state ? { meta: { state: rv.state } } : {}),
  };
}
