import type { Artifact, Contradiction } from "../types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function on(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return y && m && d ? ` on ${d} ${MONTHS[Number(m) - 1] ?? m} ${y}` : "";
}

const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

export function detectContradictions(artifacts: Artifact[]): Contradiction[] {
  const commits = artifacts.filter((a) => a.kind === "commit");

  const byRef = new Map<string, Artifact>();
  for (const c of commits) {
    const sha = str(c.meta?.sha);
    if (sha) byRef.set(sha, c);
    if (c.ref) byRef.set(c.ref, c);
  }
  const byHeadline = new Map<string, Artifact>();
  for (const c of commits) byHeadline.set(c.title.trim(), c);

  const out: Contradiction[] = [];
  const seen = new Set<string>();
  const push = (c: Contradiction) => {
    const key = `${c.artifactId}:${c.kind}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(c);
    }
  };

  for (const r of commits) {
    const target = revertTarget(r, byRef, byHeadline);
    if (target && target.id !== r.id) {
      push({
        artifactId: target.id,
        by: r.id,
        kind: "revert",
        detail: `Reverted by ${r.ref ?? r.id}${on(r.date)} — the change was later undone.`,
      });
    }
  }

  for (const iss of artifacts) {
    if (iss.kind !== "issue") continue;
    const state = str(iss.meta?.state);
    const reason = str(iss.meta?.stateReason);
    const label = iss.ref ?? "This issue";
    if (state === "OPEN") {
      push({
        artifactId: iss.id,
        kind: "reopened",
        detail: `${label} is open again — reopened after the change that was meant to close it.`,
      });
    } else if (state === "CLOSED" && reason === "NOT_PLANNED") {
      push({
        artifactId: iss.id,
        kind: "declined",
        detail: `${label} was closed as not planned — the motivation was declined.`,
      });
    }
  }

  return out;
}

function revertTarget(
  r: Artifact,
  byRef: Map<string, Artifact>,
  byHeadline: Map<string, Artifact>,
): Artifact | null {
  const sha = /this reverts commit ([0-9a-f]{7,40})/i.exec(r.body)?.[1];
  if (sha) {
    for (const [ref, art] of byRef) {
      if (ref.startsWith(sha) || sha.startsWith(ref)) return art;
    }
  }

  const headline = /^Revert\s+"(.+)"/m.exec(r.title.trim())?.[1]?.trim();
  if (headline) {
    const art = byHeadline.get(headline);
    if (art) return art;
  }

  return null;
}
