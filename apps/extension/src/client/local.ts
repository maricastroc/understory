import { type DigResult, investigate, parseLocation, runWithTokens } from "@understory/core";
import type { InvestigationTarget } from "../target";

const DEFAULT_QUESTION = "Why is this line the way it is? Reconstruct why it changed.";

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
