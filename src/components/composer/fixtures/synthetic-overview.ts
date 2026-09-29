import type { RepoMeta, ShownFile, TreeOverview } from "@understory/core/types";

const file = (path: string, reason: ShownFile["reason"], churn = 0): ShownFile => ({
  path,
  blobSha: `${path.replace(/\W/g, "")}`.padEnd(40, "0").slice(0, 40),
  size: 1200,
  reason,
  churn,
});

export const syntheticMeta: RepoMeta = {
  name: "acme/payments-service",
  branch: "main",
  kind: "github",
  htmlUrl: "https://git.example.com/acme/payments-service",
  private: false,
  description: null,
  language: "TypeScript",
  stars: 312,
  forks: 41,
  openIssues: 23,
  pushedAt: "2026-09-25T10:00:00Z",
  topics: [],
};

export const syntheticOverview: TreeOverview = {
  head: { sha: "4e1d0a2".padEnd(40, "0"), date: "2026-09-25T09:40:00Z" },
  total: 1284,
  truncated: false,
  shallow: false,
  mappable: true,
  prData: "github",
  recentCommits: 12,
  files: [
    file("src/billing/charge.ts", "case"),
    file("src/billing/refund.ts", "case"),
    file("src/webhooks/router.ts", "recent", 4),
    file("config/flags.ts", "recent", 3),
    file("src/webhooks/verify.ts", "recent", 3),
    file("src/billing/ledger.ts", "recent", 2),
    file("src/billing/invoice.ts", "recent", 2),
    file("src/webhooks/legacy.ts", "recent", 2),
    file("src/lib/sleep.ts", "recent", 1),
    file("src/lib/log.ts", "recent", 1),
    file("src/lib/retry.ts", "recent", 1),
    file("config/env.ts", "recent", 1),
    file("tests/charge.spec.ts", "recent", 1),
    file("tests/webhooks.spec.ts", "recent", 1),
  ],
};

export const syntheticCaseCounts = new Map([
  ["src/billing/charge.ts", 3],
  ["src/billing/refund.ts", 1],
]);
