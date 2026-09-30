import { verify } from "@understory/core/verify";
import type { Artifact, DigResult, Evidence } from "@understory/core/types";
import type { Entry } from "../../investigator/use-investigation";
import { syntheticArtifacts, syntheticEvidence, syntheticRetryCap } from "./synthetic-retry-cap";
import { syntheticEvidenceOnly, syntheticNotRecorded } from "./synthetic-states";

const REPO = syntheticEvidence.repo;
const REMOTE = REPO.remoteUrl!;
const sha = (short: string) => short.padEnd(40, "0");

function located(result: DigResult, question: string, file: string, line: number): DigResult {
  return {
    ...result,
    evidence: { ...result.evidence, question, location: { file, startLine: line, endLine: line } },
  };
}

const reviewAnchored: DigResult = (() => {
  const artifacts = syntheticArtifacts
    .filter((a) => a.id === "pr:812" || a.kind === "review")
    .map((a) => ({ ...a, parentId: a.kind === "review" ? "pr:812" : undefined }));
  const evidence: Evidence = {
    question: "Which alternatives did review reject?",
    repo: { ...REPO, sha: undefined },
    anchor: { kind: "review", id: "review:812-1", ref: "#812", number: 812 },
    artifacts,
    contradictions: [],
  };
  const narrative = {
    answerable: true,
    recorded: true,
    claims: [
      {
        text: "Review rejected five attempts because it overran the webhook window.",
        citations: ["review:812-1"],
      },
    ],
    answer: "Review rejected five attempts because it overran the webhook window.",
    citations: ["review:812-1"],
  };
  return {
    evidence,
    narrative: verify(evidence, narrative, {
      checked: true,
      supported: 1,
      misattributed: 0,
      checks: [
        {
          citation: "review:812-1",
          claim: 0,
          status: "supported",
          quote: "3 gives a 7 s worst case",
          reason: "the review states the timing budget",
        },
      ],
    }),
  };
})();

const idempotency: DigResult = (() => {
  const artifacts: Artifact[] = [
    {
      id: "pr:901",
      kind: "pull_request",
      title: "Use the request id as the idempotency key",
      body: "Use the request id as the idempotency key\n\nRetries must not create a second charge, so Stripe gets req.id as the idempotency key.",
      url: `${REMOTE}/pull/901`,
      date: "2023-08-14T09:00:00Z",
      ref: "#901",
      parentId: "commit:c0a41e9",
      meta: { mergedAt: "2023-08-20T10:00:00Z", reviewLookup: "none", issueLookup: "none" },
    },
    {
      id: "commit:c0a41e9",
      kind: "commit",
      title: "Pass req.id as the idempotency key",
      body: "Pass req.id as the idempotency key",
      url: `${REMOTE}/commit/${sha("c0a41e9")}`,
      date: "2023-08-20T10:00:00Z",
      author: { name: "Ana Lima" },
      ref: "c0a41e9",
      meta: { sha: sha("c0a41e9"), prLookup: "found" },
    },
  ];
  const evidence: Evidence = {
    question: "Why is the idempotency key req.id?",
    repo: REPO,
    location: { file: "src/billing/charge.ts", startLine: 11, endLine: 11 },
    artifacts,
    contradictions: [],
    coverage: { granularity: "line" },
  };
  const narrative = {
    answerable: true,
    recorded: true,
    claims: [
      {
        text: "Retries must not create a second charge, so the request id is the key.",
        citations: ["pr:901"],
      },
    ],
    answer: "Retries must not create a second charge, so the request id is the key.",
    citations: ["pr:901"],
  };
  return {
    evidence,
    narrative: verify(evidence, narrative, {
      checked: true,
      supported: 1,
      misattributed: 0,
      checks: [
        {
          citation: "pr:901",
          claim: 0,
          status: "supported",
          quote: "Retries must not create a second charge",
          reason: "the PR states it",
        },
      ],
    }),
  };
})();

export const syntheticCases: Entry[] = [
  {
    caseId: "GI-2049",
    form: {
      repoPath: REPO.path,
      location: "src/billing/charge.ts:9",
      question: "Why exactly 3 retries?",
    },
    result: syntheticRetryCap,
  },
  {
    caseId: "GI-2054",
    form: {
      repoPath: REPO.path,
      location: "#812",
      question: "Which alternatives did review reject?",
    },
    result: reviewAnchored,
    parentCaseId: "GI-2049",
    parentQuestion: "Why exactly 3 retries?",
  },
  {
    caseId: "GI-2050",
    form: {
      repoPath: REPO.path,
      location: "src/billing/charge.ts:11",
      question: "Why is the idempotency key req.id?",
    },
    result: idempotency,
  },
  {
    caseId: "GI-2051",
    form: {
      repoPath: REPO.path,
      location: "src/billing/charge.ts:13",
      question: "Why are 4xx errors never retried?",
    },
    result: located(
      syntheticNotRecorded(),
      "Why are 4xx errors never retried?",
      "src/billing/charge.ts",
      13,
    ),
  },
  {
    caseId: "GI-2052",
    form: {
      repoPath: REPO.path,
      location: "src/billing/refund.ts:42",
      question: "Why does refund skip the ledger?",
    },
    result: located(
      syntheticEvidenceOnly(),
      "Why does refund skip the ledger?",
      "src/billing/refund.ts",
      42,
    ),
  },
];
