import type { Artifact } from "@/lib/types";
import {
  type CommitNode,
  type IssueNode,
  type PrNode,
  type ReviewNode,
  commitArtifact,
  issueArtifact,
  prArtifact,
  reviewArtifact,
} from "./artifacts";
import { graphql } from "./client";

type Comment = { author: { login: string } | null; body: string; createdAt: string };

const MAX_COMMENTS = 8;

function foldComments(header: string, comments: Comment[]): string {
  const real = comments.filter((c) => c.body?.trim());
  if (!real.length) return header;
  const digest = real
    .slice(0, MAX_COMMENTS)
    .map((c) => `@${c.author?.login ?? "someone"}: ${c.body.trim()}`)
    .join("\n\n");
  return header ? `${header}\n\n— discussion —\n${digest}` : digest;
}

const COMMENTS = "comments(first: 8) { nodes { author { login } body createdAt } }";

const PR_CONTEXT_QUERY = `
query PrContext($owner:String!, $repo:String!, $number:Int!) {
  repository(owner:$owner, name:$repo) {
    pullRequest(number:$number) {
      number title body url createdAt
      commits(first: 20) {
        nodes { commit { oid abbreviatedOid messageHeadline message url committedDate author { name email } } }
      }
      reviews(first: 10) {
        nodes {
          author { login } state body submittedAt
          ${COMMENTS}
        }
      }
      ${COMMENTS}
      closingIssuesReferences(first: 5) {
        nodes { number title body url createdAt state stateReason ${COMMENTS} }
      }
    }
  }
}`;

const ISSUE_CONTEXT_QUERY = `
query IssueContext($owner:String!, $repo:String!, $number:Int!) {
  repository(owner:$owner, name:$repo) {
    issue(number:$number) {
      number title body url createdAt state stateReason
      ${COMMENTS}
      timelineItems(first: 20, itemTypes: [CROSS_REFERENCED_EVENT]) {
        nodes {
          ... on CrossReferencedEvent {
            source { ... on PullRequest { number title body url createdAt } }
          }
        }
      }
    }
  }
}`;

const COMMIT_CONTEXT_QUERY = `
query CommitContext($owner:String!, $repo:String!, $oid:String!) {
  repository(owner:$owner, name:$repo) {
    object(expression:$oid) {
      ... on Commit {
        oid abbreviatedOid messageHeadline message url committedDate author { name email }
        associatedPullRequests(first: 1) { nodes { number } }
      }
    }
  }
}`;

type PrContextNode = PrNode & {
  commits: { nodes: { commit: CommitNode }[] };
  reviews: { nodes: (ReviewNode & { comments: { nodes: Comment[] } })[] };
  comments: { nodes: Comment[] };
  closingIssuesReferences: { nodes: (IssueNode & { comments: { nodes: Comment[] } })[] };
};

export async function prContextArtifacts(
  owner: string,
  repo: string,
  number: number,
): Promise<Artifact[]> {
  const data = await graphql<{ repository: { pullRequest: PrContextNode | null } | null }>(
    PR_CONTEXT_QUERY,
    { owner, repo, number },
  );
  const pr = data.repository?.pullRequest;
  if (!pr) return [];

  const out: Artifact[] = [];

  const prA = prArtifact(pr);
  prA.body = foldComments(prA.body, pr.comments.nodes);
  out.push(prA);

  pr.reviews.nodes.forEach((rv, i) => {
    const hasBody = !!rv.body.trim();
    const hasComments = rv.comments.nodes.some((c) => c.body?.trim());
    if (!hasBody && !hasComments) return;
    const rvA = reviewArtifact(pr.number, pr.url, rv, i);
    rvA.body = foldComments(rv.body.trim(), rv.comments.nodes);
    out.push(rvA);
  });

  for (const iss of pr.closingIssuesReferences.nodes) {
    const issA = issueArtifact(iss);
    issA.body = foldComments(issA.body, iss.comments.nodes);
    out.push(issA);
  }

  for (const { commit } of pr.commits.nodes) out.push(commitArtifact(commit));

  return out;
}

type IssueContextNode = IssueNode & {
  comments: { nodes: Comment[] };
  timelineItems: { nodes: { source?: Partial<PrNode> | null }[] };
};

export async function issueContextArtifacts(
  owner: string,
  repo: string,
  number: number,
): Promise<Artifact[]> {
  const data = await graphql<{ repository: { issue: IssueContextNode | null } | null }>(
    ISSUE_CONTEXT_QUERY,
    { owner, repo, number },
  );
  const iss = data.repository?.issue;
  if (!iss) return [];

  const out: Artifact[] = [];

  const issA = issueArtifact(iss);
  issA.body = foldComments(issA.body, iss.comments.nodes);
  out.push(issA);

  for (const { source } of iss.timelineItems.nodes) {
    if (source?.number != null && source.title != null) {
      out.push(
        prArtifact({
          number: source.number,
          title: source.title,
          body: source.body ?? "",
          url: source.url ?? "",
          createdAt: source.createdAt ?? "",
        }),
      );
    }
  }

  return out;
}

type CommitContextNode = CommitNode & {
  associatedPullRequests: { nodes: { number: number }[] };
};

export async function commitContextArtifacts(
  owner: string,
  repo: string,
  oid: string,
): Promise<Artifact[]> {
  const data = await graphql<{ repository: { object: CommitContextNode | null } | null }>(
    COMMIT_CONTEXT_QUERY,
    { owner, repo, oid },
  );
  const commit = data.repository?.object;
  if (!commit) return [];

  const out: Artifact[] = [commitArtifact(commit)];

  const prNumber = commit.associatedPullRequests?.nodes?.[0]?.number;
  if (prNumber) {
    const prArts = await prContextArtifacts(owner, repo, prNumber).catch(() => []);
    out.push(...prArts);
  }

  return out;
}
