import type { Artifact } from "@/lib/types";
import {
  type GlCommit,
  type GlIssue,
  type GlMr,
  type GlNote,
  glCommitArtifact,
  glIssueArtifact,
  glMrArtifact,
  glReviewArtifact,
} from "./artifacts";
import { glRest, projectId } from "./client";

const MAX_NOTES = 8;

function realNotes(notes: GlNote[]): GlNote[] {
  return notes.filter((n) => !n.system && n.body?.trim());
}

function foldNotes(header: string, notes: GlNote[]): string {
  const real = realNotes(notes);
  if (!real.length) return header;
  const digest = real
    .slice(0, MAX_NOTES)
    .map((n) => `@${n.author?.username ?? "someone"}: ${n.body.trim()}`)
    .join("\n\n");
  return header ? `${header}\n\n— discussion —\n${digest}` : digest;
}

async function get<T>(host: string, path: string, fallback: T): Promise<T> {
  return glRest<T>(host, path).catch(() => fallback);
}

export type MergeRequestBundle = { mr: GlMr | null; reviews: GlNote[]; issues: GlIssue[] };

export async function mergeRequestBundle(
  host: string,
  project: string,
  iid: number,
): Promise<MergeRequestBundle> {
  const id = projectId(project);
  const [mr, notes, issues] = await Promise.all([
    get<GlMr | null>(host, `/projects/${id}/merge_requests/${iid}`, null),
    get<GlNote[]>(
      host,
      `/projects/${id}/merge_requests/${iid}/notes?sort=asc&order_by=created_at`,
      [],
    ),
    get<GlIssue[]>(host, `/projects/${id}/merge_requests/${iid}/closes_issues`, []),
  ]);
  return { mr, reviews: realNotes(notes), issues };
}

export async function mrContextArtifacts(
  host: string,
  project: string,
  iid: number,
): Promise<Artifact[]> {
  const id = projectId(project);
  const bundle = await mergeRequestBundle(host, project, iid);
  if (!bundle.mr) return [];

  const out: Artifact[] = [];
  const prA = glMrArtifact(bundle.mr);
  prA.body = foldNotes(prA.body, bundle.reviews);
  out.push(prA);

  bundle.reviews.slice(0, 10).forEach((n, i) => out.push(glReviewArtifact(iid, prA.url, n, i)));
  for (const iss of bundle.issues) out.push(glIssueArtifact(iss));

  const commits = await get<GlCommit[]>(host, `/projects/${id}/merge_requests/${iid}/commits`, []);
  for (const c of commits) out.push(glCommitArtifact(c));

  return out;
}

export async function issueContextArtifactsGitLab(
  host: string,
  project: string,
  iid: number,
): Promise<Artifact[]> {
  const id = projectId(project);
  const [iss, notes, mrs] = await Promise.all([
    get<GlIssue | null>(host, `/projects/${id}/issues/${iid}`, null),
    get<GlNote[]>(host, `/projects/${id}/issues/${iid}/notes?sort=asc&order_by=created_at`, []),
    get<GlMr[]>(host, `/projects/${id}/issues/${iid}/related_merge_requests`, []),
  ]);
  if (!iss) return [];

  const out: Artifact[] = [];
  const issA = glIssueArtifact(iss);
  issA.body = foldNotes(issA.body, notes);
  out.push(issA);

  for (const mr of mrs) out.push(glMrArtifact(mr));

  return out;
}

export async function commitContextArtifactsGitLab(
  host: string,
  project: string,
  sha: string,
): Promise<Artifact[]> {
  const id = projectId(project);
  const commit = await get<GlCommit | null>(
    host,
    `/projects/${id}/repository/commits/${sha}`,
    null,
  );
  if (!commit) return [];

  const out: Artifact[] = [glCommitArtifact(commit)];

  const mrs = await get<GlMr[]>(host, `/projects/${id}/repository/commits/${sha}/merge_requests`, []);
  const iid = mrs[0]?.iid;
  if (iid != null) out.push(...(await mrContextArtifacts(host, project, iid).catch(() => [])));

  return out;
}
