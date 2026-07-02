/**
 * [2]+[3] Collection seam.
 *
 * `collect()` turns a question about a place in the code into Evidence.
 * Today it reads git only. When GitHub enrichment (PRs, issues, reviews) is
 * added, it plugs in *here* — the Evidence shape the rest of the app consumes
 * does not change.
 */

import type { CodeLocation, Evidence } from "../types";
import { commitToArtifact, isGitRepo, lineHistory, resolveRepo } from "./git";

export type CollectInput = {
  /** Local path to the repository clone. */
  repoPath: string;
  /** The question being investigated. */
  question: string;
  /** The line under investigation. */
  location: CodeLocation;
};

/** Gather all evidence for one question. */
export async function collect(input: CollectInput): Promise<Evidence> {
  const { repoPath, question, location } = input;

  if (!(await isGitRepo(repoPath))) {
    throw new Error(`Not a git repository: ${repoPath}`);
  }

  const repo = await resolveRepo(repoPath);
  const commits = await lineHistory(repoPath, location);
  const artifacts = commits.map((c) => commitToArtifact(c, repo));

  // Later: enrich `artifacts` with the PRs/issues/reviews behind these commits.
  return { question, repo, location, artifacts };
}

/** Parse "src/billing/charge.ts:8" or "...:8-12" into a CodeLocation. */
export function parseLocation(raw: string): CodeLocation {
  const at = raw.lastIndexOf(":");
  if (at === -1) {
    throw new Error(`Location must be "file:line" or "file:start-end" (got "${raw}")`);
  }
  const file = raw.slice(0, at);
  const span = raw.slice(at + 1);
  const m = span.match(/^(\d+)(?:[-,](\d+))?$/);
  if (!file || !m) {
    throw new Error(`Bad location "${raw}" — expected e.g. src/app/charge.ts:8 or charge.ts:8-12`);
  }
  const startLine = Number(m[1]);
  const endLine = m[2] ? Number(m[2]) : startLine;
  return { file, startLine, endLine };
}
