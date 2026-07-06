import { prisma } from "./db";

const enabled = process.env.CAPTURE_QUESTIONS !== "0";

export function captureQuestion(entry: {
  question: string;
  repoPath: string;
  location?: string;
  anchorKind?: string;
}): void {
  if (!enabled || !prisma) return;
  // Fire-and-forget: capture must never delay or fail an investigation.
  void prisma.questionLog.create({ data: entry }).catch(() => {});
}
