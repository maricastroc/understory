import { verifyDiff } from "@git-investigator/core/diff/verify";
import type { DiffCluster, DiffCollection, DiffNarrative } from "@git-investigator/core/diff/types";
import type { Artifact, Entailment } from "@git-investigator/core/types";
import { buildPrView } from "../../pr-investigation/model/build-pr-view";

const NOW = Date.parse("2026-09-27T12:00:00.000Z");
const sha = (short: string) => short.padEnd(40, "0");

const commit = (short: string, title: string, date: string, prLookup: string): Artifact => ({
  id: `commit:${short}`,
  kind: "commit",
  title,
  body: title,
  url: "",
  date,
  ref: short,
  meta: { sha: sha(short), prLookup },
});

const pr = (
  n: number,
  title: string,
  created: string,
  merged: string,
  parentId: string,
  lookups: { reviews: string; issues: string },
): Artifact => ({
  id: `pr:${n}`,
  kind: "pull_request",
  title,
  body: title,
  url: "",
  date: created,
  ref: `#${n}`,
  parentId,
  meta: { mergedAt: merged, reviewLookup: lookups.reviews, issueLookup: lookups.issues },
});

const LEGACY = { path: "webhooks/legacy.ts", range: { start: 1, end: 88 } };

const squash: DiffCluster = {
  commitId: "commit:e4c19aa",
  rank: 0,
  contradictions: [],
  targets: [
    LEGACY,
    { path: "webhooks/router.ts", range: { start: 14, end: 22 } },
    { path: "webhooks/router.ts", range: { start: 60, end: 71 } },
    { path: "webhooks/verify.ts", range: { start: 40, end: 52 } },
  ],
  artifacts: [
    commit("e4c19aa", "Dual-path webhooks", "2024-09-20T16:40:00Z", "found"),
    pr(
      1020,
      "Dual-path webhooks for Stripe v2 migration",
      "2024-09-11T09:00:00Z",
      "2024-09-20T16:40:00Z",
      "commit:e4c19aa",
      { reviews: "found", issues: "found" },
    ),
    {
      id: "review:1020-1",
      kind: "review",
      title: "Changes requested",
      body: "Delete the dual verify together with legacy.ts.",
      url: "",
      date: "2024-09-14T11:20:00Z",
      author: { name: "ana-l" },
      parentId: "pr:1020",
      meta: { state: "CHANGES_REQUESTED" },
    },
    {
      id: "review:1020-2",
      kind: "review",
      title: "Approved",
      body: "Fallback path looks safe for the migration window.",
      url: "",
      date: "2024-09-18T15:05:00Z",
      author: { name: "dmitri-k" },
      parentId: "pr:1020",
      meta: { state: "APPROVED" },
    },
    {
      id: "issue:998",
      kind: "issue",
      title: "Stripe is retiring v1 webhook signatures",
      body: "Stripe is retiring v1 webhook signatures",
      url: "",
      date: "2024-08-05T08:30:00Z",
      parentId: "pr:1020",
      meta: { state: "CLOSED" },
    },
  ],
};

const original: DiffCluster = {
  commitId: "commit:71aa204",
  rank: 0,
  contradictions: [],
  targets: [LEGACY],
  artifacts: [
    commit("71aa204", "Add Stripe webhook handler", "2021-04-12T10:10:00Z", "found"),
    pr(
      201,
      "Stripe webhook handler",
      "2021-04-09T09:00:00Z",
      "2021-04-12T10:10:00Z",
      "commit:71aa204",
      { reviews: "none", issues: "found" },
    ),
    {
      id: "issue:140",
      kind: "issue",
      title: "Handle Stripe payment webhooks",
      body: "Handle Stripe payment webhooks",
      url: "",
      date: "2021-03-20T12:00:00Z",
      parentId: "pr:201",
      meta: { state: "CLOSED" },
    },
  ],
};

const inline: DiffCluster = {
  commitId: "commit:0d93b6f",
  rank: 0,
  contradictions: [],
  targets: [{ path: "billing/charge.ts", range: { start: 30, end: 34 } }],
  artifacts: [
    commit("0d93b6f", "charge: verify legacy events inline", "2025-06-02T13:00:00Z", "none"),
  ],
};

const tests: DiffCluster = {
  commitId: "commit:5ad77e0",
  rank: 0,
  contradictions: [],
  targets: [{ path: "tests/webhooks.spec.ts", range: { start: 112, end: 160 } }],
  artifacts: [commit("5ad77e0", "tests: cover v1 retries", "2023-11-14T17:45:00Z", "none")],
};

const clusters = [squash, original, inline, tests];

const collection: DiffCollection = {
  repo: { path: "payments-service", name: "payments-service" },
  pr: {
    number: 944,
    title: "Drop legacy webhook path",
    url: "",
    baseSha: sha("4e1d0a2"),
    headSha: sha("7c21e0b"),
    createdAt: "2026-09-20T10:00:00Z",
    mergedAt: null,
  },
  clusters,
  triage: {
    filesChanged: 5,
    filesConsidered: 5,
    filesSkipped: 0,
    targetsBlamed: 6,
    clustersFound: clusters.length,
    clustersDetailed: clusters.length,
    truncated: false,
  },
};

const narrative: DiffNarrative = {
  summaryClaims: [],
  findings: [
    {
      cluster: "C1",
      why: "pr:1020 kept the v1 path as a fallback while Stripe retired v1 signatures.",
      citations: ["pr:1020", "issue:998", "commit:e4c19aa"],
      recorded: true,
    },
    {
      cluster: "C2",
      why: "The original handler came from pr:201 so charges settle without polling.",
      citations: ["pr:201", "issue:140", "commit:71aa204"],
      recorded: true,
    },
    {
      cluster: "C3",
      why: "A direct commit with no linked PR or issue.",
      citations: [],
      recorded: false,
    },
    {
      cluster: "C4",
      why: "A direct commit whose message gives no reason.",
      citations: [],
      recorded: false,
    },
  ],
};

const audit = (citation: string, quote: string): Entailment => ({
  checked: true,
  supported: 1,
  misattributed: 0,
  checks: [{ citation, claim: 0, status: "supported", quote, reason: "The quote states it." }],
});

const entailment = new Map<string, Entailment>([
  ["C1", audit("issue:998", "Stripe is retiring v1 webhook signatures")],
  ["C2", audit("issue:140", "Handle Stripe payment webhooks")],
]);

export const landingPrView = buildPrView(verifyDiff(collection, narrative, entailment), {
  now: NOW,
});
