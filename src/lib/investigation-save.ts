import { z } from "zod";

export const saveSchema = z.object({
  caseId: z.string().min(1).max(64),
  question: z.string().max(2000),
  repoPath: z.string().min(1).max(2000),
  location: z.string().min(1).max(2000),
  result: z.record(z.string(), z.unknown()),
  parentCaseId: z.string().min(1).max(64).nullish(),
});

export function isMissingColumn(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2022"
  );
}
