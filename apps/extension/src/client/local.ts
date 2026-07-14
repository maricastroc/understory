import { type DigResult, investigate, parseLocation, runWithTokens } from "@git-investigator/core";
import type { InvestigationTarget } from "../target";

const DEFAULT_QUESTION = "Why is this line the way it is? Reconstruct why it changed.";

// A GitHub token lets the local collector enrich each blamed commit with the PR/issue/review
// discussion behind it — full git-log-L history AND the recorded "why". Without one it
// degrades to commits only. The token rides an AsyncLocalStorage context, exactly like the
// web backend's /api/dig, so the same resolveToken() sink picks it up.
export function runLocalDig(
  target: InvestigationTarget,
  apiKey: string | undefined,
  githubToken?: string,
): Promise<DigResult> {
  const location = parseLocation(target.location);
  return runWithTokens({ github: githubToken }, () =>
    investigate(
      { repoPath: target.workspacePath, question: DEFAULT_QUESTION, location },
      { apiKey },
    ),
  );
}
