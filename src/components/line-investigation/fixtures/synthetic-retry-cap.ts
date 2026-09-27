import { verify } from "@git-investigator/core/verify";
import type {
  Artifact,
  DigResult,
  Entailment,
  Evidence,
  Narrative,
} from "@git-investigator/core/types";

export const SYNTHETIC_NOW = "2026-09-27T12:00:00.000Z";

const REMOTE = "https://git.example.com/synthetic/payments-service";

const sha = (short: string) => short.padEnd(40, "0");

export const syntheticArtifacts: Artifact[] = [
  {
    id: "commit:7be210e",
    kind: "commit",
    title: "Add retry loop to charge",
    body: "Add retry loop to charge",
    url: `${REMOTE}/commit/${sha("7be210e")}`,
    date: "2021-06-18T14:02:00Z",
    author: { name: "Leo Park", email: "leo@example.com" },
    ref: "7be210e",
    meta: { sha: sha("7be210e"), prLookup: "none" },
  },
  {
    id: "issue:1187",
    kind: "issue",
    title: "Customers double-billed during Stripe outage",
    body: "Customers double-billed during Stripe outage\n\nStripe returned 504s for ~40 min and chargeCustomer kept retrying. 212 customers were charged twice; refunds issued manually.",
    url: `${REMOTE}/issues/1187`,
    date: "2023-03-02T09:14:00Z",
    ref: "#1187",
    parentId: "pr:812",
    meta: { state: "CLOSED" },
  },
  {
    id: "pr:812",
    kind: "pull_request",
    title: "Bound retries in chargeCustomer",
    body: "Bound retries in chargeCustomer\n\nUnbounded retries double-charged customers during the Stripe incident (#1187). This caps attempts at 3 and adds exponential backoff.",
    url: `${REMOTE}/pull/812`,
    date: "2023-03-09T10:00:00Z",
    ref: "#812",
    parentId: "commit:92f6a3f",
    meta: { mergedAt: "2023-03-15T16:20:00Z", reviewLookup: "found", issueLookup: "found" },
  },
  {
    id: "review:812-0",
    kind: "review",
    title: "Review by ana-l on #812",
    body: "LGTM once the cap comes down. Worth a follow-up to make the charge idempotent.",
    url: `${REMOTE}/pull/812`,
    date: "2023-03-12T11:30:00Z",
    author: { name: "ana-l" },
    ref: "#812",
    parentId: "pr:812",
    meta: { state: "APPROVED" },
  },
  {
    id: "review:812-1",
    kind: "review",
    title: "Review by dmitri-k on #812",
    body: "5 attempts with backoff blows past Stripe’s 10 s webhook window (1+2+4+8+16). 3 gives a 7 s worst case.",
    url: `${REMOTE}/pull/812`,
    date: "2023-03-14T15:45:00Z",
    author: { name: "dmitri-k" },
    ref: "#812",
    parentId: "pr:812",
    meta: { state: "CHANGES_REQUESTED" },
  },
  {
    id: "commit:92f6a3f",
    kind: "commit",
    title: "Cap charge retries at 3, add backoff",
    body: "Cap charge retries at 3, add backoff\n\nBound retries in chargeCustomer to 3 attempts with 1s/2s/4s backoff. Fixes the double-charge path from #1187.",
    url: `${REMOTE}/commit/${sha("92f6a3f")}`,
    date: "2023-03-15T16:20:00Z",
    author: { name: "Priya Raman", email: "priya@example.com" },
    ref: "92f6a3f",
    meta: { sha: sha("92f6a3f"), prLookup: "found" },
  },
];

export const syntheticEvidence: Evidence = {
  question: "Why exactly 3 retries?",
  repo: {
    path: "fixtures/synthetic/payments-service",
    name: "synthetic/payments-service",
    remoteUrl: REMOTE,
    branch: "main",
    sha: sha("4e1d0a2"),
  },
  location: { file: "src/billing/charge.ts", startLine: 9, endLine: 9 },
  artifacts: syntheticArtifacts,
  contradictions: [],
  coverage: { granularity: "line" },
};

const claims = [
  {
    text: "Capped at three attempts, with 1 s · 2 s · 4 s backoff.",
    citations: ["commit:92f6a3f", "pr:812"],
  },
  {
    text: "The cap followed an unbounded retry loop that charged 212 customers twice during a Stripe outage.",
    citations: ["issue:1187", "pr:812"],
  },
  {
    text: "Review cut the proposed five to three so retries finish inside Stripe’s 10 s webhook window.",
    citations: ["review:812-1", "review:812-0"],
  },
];

export const syntheticNarrative: Narrative = {
  answerable: true,
  recorded: true,
  claims,
  answer: claims.map((c) => c.text).join(" "),
  citations: Array.from(new Set(claims.flatMap((c) => c.citations))),
};

export const syntheticEntailment: Entailment = {
  checked: true,
  supported: 3,
  misattributed: 0,
  checks: [
    {
      citation: "commit:92f6a3f",
      claim: 0,
      status: "supported",
      quote: "3 attempts with 1s/2s/4s backoff",
      reason: "the commit states the cap and the backoff schedule",
    },
    {
      citation: "pr:812",
      claim: 0,
      status: "supported",
      quote: null,
      reason: "the commit states the cap and the backoff schedule",
    },
    {
      citation: "issue:1187",
      claim: 1,
      status: "supported",
      quote: "212 customers were charged twice",
      reason: "the issue records the double charge during the outage",
    },
    {
      citation: "pr:812",
      claim: 1,
      status: "supported",
      quote: null,
      reason: "the issue records the double charge during the outage",
    },
    {
      citation: "review:812-1",
      claim: 2,
      status: "supported",
      quote: "3 gives a 7 s worst case",
      reason: "the review ties the cap to the webhook window",
    },
    {
      citation: "review:812-0",
      claim: 2,
      status: "supported",
      quote: null,
      reason: "the review ties the cap to the webhook window",
    },
  ],
};

export const syntheticRetryCap: DigResult = {
  evidence: syntheticEvidence,
  narrative: verify(syntheticEvidence, syntheticNarrative, syntheticEntailment),
};
