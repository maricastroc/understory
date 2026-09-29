import { verify } from "@understory/core/verify";
import type {
  Artifact,
  CitationCheck,
  DigResult,
  Entailment,
  Evidence,
  Narrative,
  VerifiedNarrative,
} from "@understory/core/types";
import {
  syntheticArtifacts,
  syntheticEntailment,
  syntheticEvidence,
  syntheticNarrative,
} from "./synthetic-retry-cap";

const LOOKUP_KEYS = ["prLookup", "reviewLookup", "issueLookup", "mergedAt", "state"];

function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  return Object.fromEntries(Object.entries(obj).filter(([k]) => !keys.includes(k as K))) as Omit<
    T,
    K
  >;
}

function withNarrative(narrative: Narrative, entailment?: Entailment, ev = syntheticEvidence) {
  return { evidence: ev, narrative: verify(ev, narrative, entailment) };
}

function narrativeOf(claims: Narrative["claims"]): Narrative {
  return {
    answerable: true,
    recorded: true,
    claims,
    answer: claims.map((c) => c.text).join(" "),
    citations: Array.from(new Set(claims.flatMap((c) => c.citations))),
  };
}

function entailmentOf(checks: CitationCheck[]): Entailment {
  const byClaim = new Map<number, CitationCheck["status"]>();
  for (const c of checks) if (c.claim !== undefined) byClaim.set(c.claim, c.status);
  const verdicts = [...byClaim.values()];
  return {
    checked: true,
    checks,
    supported: verdicts.filter((s) => s === "supported").length,
    misattributed: verdicts.filter((s) => s === "unsupported").length,
  };
}

export function syntheticEvidenceOnly(): DigResult {
  return {
    evidence: syntheticEvidence,
    narrative: null,
    error:
      "The write-up model is rate-limited for the moment — the evidence and provenance chain below are complete. Try the summary again in a minute.",
  };
}

export function syntheticNotRecorded(): DigResult {
  return withNarrative({
    answerable: true,
    recorded: false,
    claims: [],
    answer: "The history does not explain why the charge is retried at all.",
    citations: [],
  });
}

export function syntheticNoHistory(): DigResult {
  return withNarrative(
    {
      answerable: true,
      recorded: false,
      claims: [],
      answer: "No commit in the history that was read touches this line.",
      citations: [],
    },
    undefined,
    { ...syntheticEvidence, artifacts: [], contradictions: [] },
  );
}

export function syntheticOutOfScope(): DigResult {
  return withNarrative({
    answerable: false,
    recorded: false,
    claims: [],
    answer: "This question is outside what this code's history can answer.",
    citations: [],
  });
}

export function syntheticFabricated(): DigResult {
  const narrative = narrativeOf([
    syntheticNarrative.claims[0],
    { text: "The limit came from a load test.", citations: ["commit:deadbee", "pr:812"] },
  ]);
  return withNarrative(
    narrative,
    entailmentOf(syntheticEntailment.checks.filter((c) => c.claim === 0)),
  );
}

export function syntheticUncited(): DigResult {
  const narrative = narrativeOf([
    syntheticNarrative.claims[0],
    { text: "The team later regretted the limit.", citations: ["commit:deadbee"] },
  ]);
  return withNarrative(
    narrative,
    entailmentOf(syntheticEntailment.checks.filter((c) => c.claim === 0)),
  );
}

export function syntheticMisattributed(): DigResult {
  const checks = syntheticEntailment.checks.map((c) =>
    c.claim === 2
      ? {
          ...c,
          status: "unsupported" as const,
          quote: null,
          reason: "the reviews do not mention five",
        }
      : c,
  );
  return withNarrative(syntheticNarrative, entailmentOf(checks));
}

export function syntheticWeak(): DigResult {
  const checks = syntheticEntailment.checks.map((c) =>
    c.claim === 1
      ? { ...c, status: "weak" as const, quote: null, reason: "on topic, no single line" }
      : c,
  );
  return withNarrative(syntheticNarrative, entailmentOf(checks));
}

export function syntheticUnaudited(): DigResult {
  return withNarrative(syntheticNarrative);
}

export function syntheticBeyondAuditCap(): DigResult {
  const extra = Array.from({ length: 5 }, (_, i) => ({
    text: `Additional reconstruction step ${i + 1}.`,
    citations: ["commit:92f6a3f"],
  }));
  const narrative = narrativeOf([...syntheticNarrative.claims, ...extra]);
  const extraChecks: CitationCheck[] = [3, 4, 5].map((claim) => ({
    citation: "commit:92f6a3f",
    claim,
    status: "weak",
    quote: null,
    reason: "restates the commit",
  }));
  return withNarrative(narrative, entailmentOf([...syntheticEntailment.checks, ...extraChecks]));
}

export function syntheticContradicted(): DigResult {
  const ev: Evidence = {
    ...syntheticEvidence,
    contradictions: [
      { artifactId: "pr:812", by: "commit:0badc0d", kind: "revert", detail: "Reverted by 0badc0d" },
    ],
  };
  return withNarrative(syntheticNarrative, syntheticEntailment, ev);
}

export function syntheticFileGranularity(): DigResult {
  const ev: Evidence = {
    ...syntheticEvidence,
    coverage: { granularity: "file" },
    note: "GitHub's blame API couldn't resolve line-level history for this file — showing recent commits that touched it instead.",
  };
  return withNarrative(syntheticNarrative, syntheticEntailment, ev);
}

export function syntheticCommitsOnly(): DigResult {
  const commits = syntheticArtifacts
    .filter((a) => a.kind === "commit")
    .map((a) => ({ ...a, meta: { ...a.meta, prLookup: "skipped" } }));
  const ev: Evidence = { ...syntheticEvidence, artifacts: commits };
  return { evidence: ev, narrative: null, error: "No language model is configured." };
}

export function syntheticManyArtifacts(count: number): DigResult {
  const base = Date.parse("2023-03-15T16:20:00Z");
  const reviews: Artifact[] = Array.from({ length: count }, (_, i) => ({
    id: `review:812-${i + 2}`,
    kind: "review",
    title: `Review ${i + 2} on #812`,
    body: `Review comment ${i + 2}`,
    url: "https://git.example.com/synthetic/payments-service/pull/812",
    date: new Date(base - (i + 1) * 3_600_000 * 7).toISOString(),
    parentId: "pr:812",
    ref: "#812",
  }));
  const artifacts = [...syntheticArtifacts, ...reviews].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  return { evidence: { ...syntheticEvidence, artifacts }, narrative: null };
}

export function syntheticWithoutStageFourData(): DigResult {
  const artifacts = syntheticArtifacts.map((a) => {
    const meta = Object.fromEntries(
      Object.entries(a.meta ?? {}).filter(([k]) => !LOOKUP_KEYS.includes(k)),
    );
    const rest = omit(a, ["meta"]);
    return Object.keys(meta).length ? { ...rest, meta } : rest;
  });
  return withNarrative(syntheticNarrative, syntheticEntailment, {
    ...syntheticEvidence,
    repo: omit(syntheticEvidence.repo, ["sha"]),
    artifacts,
  });
}

export function syntheticLegacyNoEdges(): DigResult {
  const artifacts = syntheticArtifacts.map((a) => omit(a, ["parentId"]));
  return withNarrative(syntheticNarrative, syntheticEntailment, {
    ...syntheticEvidence,
    artifacts,
  });
}

export function syntheticLegacyCitationChecks(): DigResult {
  const checks = syntheticEntailment.checks.filter((c) => c.quote).map((c) => omit(c, ["claim"]));
  return withNarrative(syntheticNarrative, entailmentOf(checks));
}

export function syntheticLegacyNoClaims(): DigResult {
  const verified = verify(syntheticEvidence, syntheticNarrative, syntheticEntailment);
  return {
    evidence: syntheticEvidence,
    narrative: omit(verified, ["claims"]) as unknown as VerifiedNarrative,
  };
}
