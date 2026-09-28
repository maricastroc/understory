import { verifyDiff } from "@git-investigator/core/diff/verify";
import type {
  DiffCluster,
  DiffCollection,
  DiffNarrative,
  DiffResult,
  HunkLine,
  TargetHunk,
} from "@git-investigator/core/diff/types";
import type { Artifact, Entailment } from "@git-investigator/core/types";

export const SYNTHETIC_PR_NOW = "2026-09-27T12:00:00.000Z";

const REMOTE = "https://git.example.com/synthetic/payments-service";
const sha = (short: string) => short.padEnd(40, "0");

function hunk(
  lines: Array<["-" | "+", number, string]>,
  extra: { removed?: number } = {},
): TargetHunk {
  const rows: HunkLine[] = lines.map(([m, n, text]) =>
    m === "-" ? { kind: "del", old: n, new: null, text } : { kind: "add", old: null, new: n, text },
  );
  const removed = rows.filter((l) => l.kind === "del").length + (extra.removed ?? 0);
  return {
    lines: rows,
    removed,
    added: rows.filter((l) => l.kind === "add").length,
    omitted: extra.removed ?? 0,
  };
}

const commit = (
  short: string,
  title: string,
  date: string,
  author: string,
  prLookup: string,
): Artifact => ({
  id: `commit:${short}`,
  kind: "commit",
  title,
  body: title,
  url: `${REMOTE}/commit/${sha(short)}`,
  date,
  author: { name: author, email: `${author.split(" ")[0].toLowerCase()}@example.com` },
  ref: short,
  meta: { sha: sha(short), prLookup },
});

const pr = (
  n: number,
  title: string,
  body: string,
  created: string,
  merged: string,
  parentId: string,
  lookups: { reviews: boolean; issues: boolean },
): Artifact => ({
  id: `pr:${n}`,
  kind: "pull_request",
  title,
  body: `${title}\n\n${body}`,
  url: `${REMOTE}/pull/${n}`,
  date: created,
  ref: `#${n}`,
  parentId,
  meta: {
    mergedAt: merged,
    reviewLookup: lookups.reviews ? "found" : "none",
    issueLookup: lookups.issues ? "found" : "none",
  },
});

const LEGACY = { path: "webhooks/legacy.ts", range: { start: 1, end: 88 } };

const legacyHunk = hunk(
  [
    ["-", 1, "// v1 Stripe webhook handler"],
    ["-", 2, 'import { verifyV1 } from "./verify";'],
    ["-", 3, "export async function handleLegacy(evt) {"],
    ["-", 4, "  // kept for Stripe v2 migration, see #998"],
  ],
  { removed: 84 },
);

const squash: DiffCluster = {
  commitId: "commit:e4c19aa",
  rank: 0,
  contradictions: [],
  targets: [
    { ...LEGACY, hunk: legacyHunk },
    {
      path: "webhooks/router.ts",
      range: { start: 14, end: 22 },
      hunk: hunk([
        ["-", 14, 'if (req.headers["stripe-version"] < V2) {'],
        ["-", 15, "  return handleLegacy(evt);"],
        ["-", 16, "}"],
        ["+", 14, "assertV2(req.headers);"],
        ["+", 15, "return handleV2(evt);"],
      ]),
    },
    {
      path: "webhooks/router.ts",
      range: { start: 60, end: 71 },
      hunk: hunk(
        [
          ["-", 60, "} catch (err) {"],
          ["-", 61, "  if (FLAGS.STRIPE_V2_ONLY) throw err;"],
          ["-", 62, '  logger.warn("v2 failed, falling back");'],
          ["-", 63, "  return handleLegacy(evt);"],
        ],
        { removed: 8 },
      ),
    },
    {
      path: "webhooks/verify.ts",
      range: { start: 40, end: 52 },
      hunk: hunk([
        ["-", 40, "export function verifyV1(sig, body) {"],
        ["-", 41, "  return hmac(env.V1_SECRET, body) === sig;"],
        ["-", 42, "}"],
        ["-", 43, "// TODO(ana): remove with legacy.ts"],
        ["+", 40, "export { verifyV2 as verify };"],
      ]),
    },
  ],
  artifacts: [
    {
      ...commit(
        "e4c19aa",
        "Dual-path webhooks (squash of pr:1020)",
        "2024-09-20T16:40:00Z",
        "Priya Raman",
        "found",
      ),
      body: "Dual-path webhooks (squash of pr:1020)\n\nRoute v1 and v2 events; keep legacy.ts as fallback behind STRIPE_V2_ONLY.",
    },
    pr(
      1020,
      "Dual-path webhooks for Stripe v2 migration",
      "Keep the v1 handler as a fallback until STRIPE_V2_ONLY ships, then delete legacy.ts and the v1 routes. Closes #998.",
      "2024-09-11T09:00:00Z",
      "2024-09-20T16:40:00Z",
      "commit:e4c19aa",
      { reviews: true, issues: true },
    ),
    {
      id: "review:1020-1",
      kind: "review",
      title: "Changes requested",
      body: "Make the dual verify explicitly temporary. It should be deleted together with legacy.ts.",
      url: `${REMOTE}/pull/1020#pullrequestreview-1`,
      date: "2024-09-14T11:20:00Z",
      author: { name: "ana-l" },
      ref: "#1020",
      parentId: "pr:1020",
      meta: { state: "CHANGES_REQUESTED" },
    },
    {
      id: "review:1020-2",
      kind: "review",
      title: "Approved",
      body: "Approved. Fallback path looks safe for the migration window.",
      url: `${REMOTE}/pull/1020#pullrequestreview-2`,
      date: "2024-09-18T15:05:00Z",
      author: { name: "dmitri-k" },
      ref: "#1020",
      parentId: "pr:1020",
      meta: { state: "APPROVED" },
    },
    {
      id: "issue:998",
      kind: "issue",
      title: "Stripe is retiring v1 webhook signatures",
      body: "Stripe is retiring v1 webhook signatures\n\nStripe stops sending v1 signatures in 2026. We need a dual path while merchants migrate.",
      url: `${REMOTE}/issues/998`,
      date: "2024-08-05T08:30:00Z",
      ref: "#998",
      parentId: "pr:1020",
      meta: { state: "CLOSED" },
    },
  ],
};

const original: DiffCluster = {
  commitId: "commit:71aa204",
  rank: 0,
  contradictions: [],
  targets: [{ ...LEGACY, hunk: legacyHunk }],
  artifacts: [
    {
      ...commit(
        "71aa204",
        "Add Stripe webhook handler",
        "2021-04-12T10:10:00Z",
        "Leo Park",
        "found",
      ),
      body: "Add Stripe webhook handler\n\nAdd webhook handler for payment_intent events.",
    },
    pr(
      201,
      "Stripe webhook handler",
      "First webhook handler so charges settle without polling. Closes #140.",
      "2021-04-09T09:00:00Z",
      "2021-04-12T10:10:00Z",
      "commit:71aa204",
      { reviews: false, issues: true },
    ),
    {
      id: "issue:140",
      kind: "issue",
      title: "Handle Stripe payment webhooks",
      body: "Handle Stripe payment webhooks\n\nPolling Stripe every minute is too slow for receipts; handle webhooks instead.",
      url: `${REMOTE}/issues/140`,
      date: "2021-03-20T12:00:00Z",
      ref: "#140",
      parentId: "pr:201",
      meta: { state: "CLOSED" },
    },
  ],
};

const flag: DiffCluster = {
  commitId: "commit:b81e02c",
  rank: 0,
  contradictions: [],
  targets: [
    {
      path: "config/flags.ts",
      range: { start: 8, end: 8 },
      hunk: hunk([["-", 8, "STRIPE_V2_ONLY: true, // v1 safe to delete"]]),
    },
  ],
  artifacts: [
    commit(
      "b81e02c",
      "flags: enable STRIPE_V2_ONLY",
      "2026-01-15T09:30:00Z",
      "Priya Raman",
      "found",
    ),
    pr(
      1101,
      "Serve Stripe v2 webhooks only",
      "Flip STRIPE_V2_ONLY. The legacy handler can go in a follow-up once this has soaked for a quarter.",
      "2026-01-11T09:00:00Z",
      "2026-01-15T09:30:00Z",
      "commit:b81e02c",
      { reviews: false, issues: false },
    ),
  ],
};

const inline: DiffCluster = {
  commitId: "commit:0d93b6f",
  rank: 0,
  contradictions: [],
  targets: [
    {
      path: "billing/charge.ts",
      range: { start: 30, end: 34 },
      hunk: hunk(
        [
          ["-", 30, 'import { verifyV1 } from "../webhooks/verify";'],
          ["-", 31, "if (evt.legacy) verifyV1(evt.sig, evt.raw);"],
          ["+", 30, "// verified upstream by router"],
        ],
        { removed: 3 },
      ),
    },
  ],
  artifacts: [
    commit(
      "0d93b6f",
      "charge: verify legacy events inline",
      "2024-01-10T13:00:00Z",
      "Leo Park",
      "none",
    ),
  ],
};

const tests: DiffCluster = {
  commitId: "commit:5ad77e0",
  rank: 0,
  contradictions: [],
  targets: [
    {
      path: "tests/webhooks.spec.ts",
      range: { start: 112, end: 160 },
      hunk: hunk(
        [
          ["-", 112, 'describe("legacy v1 retries", () => {'],
          ["-", 113, '  it("replays on 409", async () => {'],
        ],
        { removed: 47 },
      ),
    },
  ],
  artifacts: [
    commit("5ad77e0", "tests: cover v1 retries", "2025-08-10T17:45:00Z", "Leo Park", "none"),
  ],
};

const docs: DiffCluster = {
  commitId: "commit:3f0a9d1",
  rank: 0,
  contradictions: [],
  targets: [
    {
      path: "docs/webhooks.md",
      range: { start: 20, end: 41 },
      hunk: hunk(
        [
          ["-", 20, "## v1 webhooks (deprecated)"],
          ["-", 21, "Removed once STRIPE_V2_ONLY ships."],
        ],
        { removed: 20 },
      ),
    },
  ],
  artifacts: [
    {
      ...commit(
        "3f0a9d1",
        "docs: mark v1 webhooks deprecated",
        "2026-04-20T08:00:00Z",
        "Ana Lima",
        "found",
      ),
      body: "docs: mark v1 webhooks deprecated\n\nMark the v1 section deprecated; removal follows STRIPE_V2_ONLY.",
    },
    pr(
      1188,
      "Deprecate v1 webhook docs",
      "Docs only. The v1 section stays until the legacy handler is deleted.",
      "2026-04-19T09:00:00Z",
      "2026-04-20T08:00:00Z",
      "commit:3f0a9d1",
      { reviews: false, issues: false },
    ),
  ],
};

const CLUSTERS = [squash, flag, docs, original, inline, tests];

export const SYNTHETIC_PR_COLLECTION: DiffCollection = {
  repo: {
    path: "synthetic/payments-service",
    name: "synthetic/payments-service",
    remoteUrl: REMOTE,
    branch: "main",
  },
  pr: {
    number: 944,
    title: "Drop legacy webhook path",
    url: `${REMOTE}/pull/944`,
    baseSha: sha("4e1d0a2"),
    headSha: sha("7c21e0b"),
    createdAt: "2026-09-20T10:00:00Z",
    mergedAt: null,
  },
  clusters: CLUSTERS,
  triage: {
    filesChanged: 14,
    filesConsidered: 11,
    filesSkipped: 3,
    targetsBlamed: 8,
    clustersFound: CLUSTERS.length,
    clustersDetailed: CLUSTERS.length,
    truncated: false,
  },
};

export const SYNTHETIC_PR_NARRATIVE: DiffNarrative = {
  summaryClaims: [
    {
      text: "Removes the v1 handler, routes and signature check that pr:1020 kept alive only as a fallback while Stripe retired v1 signatures.",
      citations: ["pr:1020", "issue:998"],
    },
    {
      text: "Its exit condition, STRIPE_V2_ONLY, shipped in January in pr:1101, and the docs were already marked deprecated in pr:1188.",
      citations: ["pr:1101", "pr:1188"],
    },
  ],
  findings: [
    {
      cluster: "C1",
      why: "Dual path kept for the Stripe v2 migration; pr:1020 planned to delete legacy.ts and the v1 routes once STRIPE_V2_ONLY shipped.",
      connection: "This PR does the deletion pr:1020 promised.",
      citations: ["pr:1020", "review:1020-1", "issue:998", "commit:e4c19aa"],
      recorded: true,
    },
    {
      cluster: "C2",
      why: "STRIPE_V2_ONLY was switched on in pr:1101, the exit condition pr:1020 waited for.",
      citations: ["pr:1101"],
      recorded: true,
    },
    {
      cluster: "C3",
      why: "The v1 section was already marked deprecated in pr:1188.",
      citations: ["pr:1188", "commit:3f0a9d1"],
      recorded: true,
    },
    {
      cluster: "C4",
      why: "The original handler came from pr:201 so charges settle without polling.",
      citations: ["pr:201", "issue:140"],
      recorded: true,
    },
    {
      cluster: "C5",
      why: "Imported verifyV1 in a direct commit with no linked PR or issue.",
      citations: [],
      recorded: false,
    },
    {
      cluster: "C6",
      why: "The v1 retry tests arrived in a direct commit whose message gives no reason.",
      citations: [],
      recorded: false,
    },
  ],
};

function audit(checks: Array<[string, string, number]>): Entailment {
  return {
    checked: true,
    checks: checks.map(([citation, quote, claim]) => ({
      citation,
      claim,
      status: "supported",
      quote,
      reason: "The quote states it.",
    })),
    supported: checks.length,
    misattributed: 0,
  };
}

const ENTAILMENT = new Map<string, Entailment>([
  [
    "C1",
    audit([
      ["pr:1020", "then delete legacy.ts and the v1 routes", 0],
      ["review:1020-1", "deleted together with legacy.ts", 0],
      ["issue:998", "Stripe stops sending v1 signatures in 2026", 0],
      ["commit:e4c19aa", "keep legacy.ts as fallback", 0],
    ]),
  ],
  ["C2", audit([["pr:1101", "The legacy handler can go in a follow-up", 0]])],
  [
    "C3",
    audit([
      ["pr:1188", "stays until the legacy handler is deleted", 0],
      ["commit:3f0a9d1", "removal follows STRIPE_V2_ONLY", 0],
    ]),
  ],
  [
    "C4",
    audit([
      ["pr:201", "charges settle without polling", 0],
      ["issue:140", "handle webhooks instead", 0],
    ]),
  ],
]);

const SUMMARY_ENTAILMENT = audit([
  ["pr:1020", "then delete legacy.ts and the v1 routes", 0],
  ["pr:1101", "The legacy handler can go in a follow-up", 1],
]);

export const syntheticPr944: DiffResult = verifyDiff(
  SYNTHETIC_PR_COLLECTION,
  SYNTHETIC_PR_NARRATIVE,
  ENTAILMENT,
  SUMMARY_ENTAILMENT,
);
