import type { ArtifactKind, ArtifactRef } from "@git-investigator/core/types";

const KINDS: readonly ArtifactKind[] = ["commit", "pull_request", "review", "issue"];

export function parseDrillRef(raw: string | null): ArtifactRef | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (typeof value.id !== "string" || !KINDS.includes(value.kind as ArtifactKind)) return null;
    const text = (k: string) => (typeof value[k] === "string" ? (value[k] as string) : undefined);
    const number = typeof value.number === "number" ? value.number : undefined;
    return {
      kind: value.kind as ArtifactKind,
      id: value.id,
      ref: text("ref"),
      title: text("title"),
      number,
      oid: text("oid"),
    };
  } catch {
    return null;
  }
}
