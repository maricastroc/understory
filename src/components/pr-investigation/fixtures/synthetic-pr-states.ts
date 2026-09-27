import { collectionToResult, verifyDiff } from "@git-investigator/core/diff/verify";
import type { DiffCluster, DiffCollection, DiffResult } from "@git-investigator/core/diff/types";
import {
  SYNTHETIC_PR_COLLECTION,
  SYNTHETIC_PR_NARRATIVE,
  syntheticPr944,
} from "./synthetic-pr-944";

export function syntheticPrAllSilent(): DiffResult {
  return verifyDiff(SYNTHETIC_PR_COLLECTION, {
    summaryClaims: [],
    findings: SYNTHETIC_PR_NARRATIVE.findings.map((f) => ({
      ...f,
      why: "",
      citations: [],
      recorded: false,
    })),
  });
}

export function syntheticPrEvidenceOnly(): DiffResult {
  return collectionToResult(
    SYNTHETIC_PR_COLLECTION,
    "The model was rate-limited, so only the collected evidence is shown.",
  );
}

export function syntheticPrTruncated(): DiffResult {
  return {
    ...syntheticPr944,
    triage: { ...syntheticPr944.triage, targetsBlamed: 23, clustersFound: 23, truncated: true },
  };
}

export function syntheticPrLegacy(): DiffResult {
  return {
    ...syntheticPr944,
    pr: { ...syntheticPr944.pr, createdAt: undefined, mergedAt: undefined },
    findings: syntheticPr944.findings.map((f) => ({
      ...f,
      targets: f.targets.map(({ path, range }) => ({ path, range })),
    })),
  };
}

function manyClusters(n: number): DiffCluster[] {
  return Array.from({ length: n }, (_, i) => {
    const day = String((i % 27) + 1).padStart(2, "0");
    const short = `c${String(i).padStart(6, "0")}`;
    return {
      commitId: `commit:${short}`,
      rank: 0,
      contradictions: [],
      targets: [
        {
          path: `src/module-${String(Math.floor(i / 4)).padStart(2, "0")}.ts`,
          range: { start: (i % 4) * 20 + 1, end: (i % 4) * 20 + 6 },
        },
      ],
      artifacts: [
        {
          id: `commit:${short}`,
          kind: "commit",
          title: `change ${i + 1}`,
          body: `change ${i + 1}`,
          url: "",
          date: `2025-${String((i % 9) + 1).padStart(2, "0")}-${day}T10:00:00Z`,
          ref: short,
          meta: { prLookup: "none" },
        },
      ],
    };
  });
}

export function syntheticPrManyRegions(n = 20): DiffResult {
  const clusters = manyClusters(n);
  const collection: DiffCollection = {
    ...SYNTHETIC_PR_COLLECTION,
    clusters,
    triage: {
      ...SYNTHETIC_PR_COLLECTION.triage,
      targetsBlamed: n,
      clustersFound: n,
      clustersDetailed: n,
    },
  };
  return verifyDiff(collection, {
    summaryClaims: [],
    findings: clusters.map((_, i) => ({
      cluster: `C${i + 1}`,
      why: "",
      citations: [],
      recorded: false,
    })),
  });
}

export function syntheticPrOverlappingBands(): DiffResult {
  const base = SYNTHETIC_PR_COLLECTION.clusters[0];
  const prA = base.artifacts.find((a) => a.id === "pr:1020")!;
  const at = (path: string, start: number) => ({ path, range: { start, end: start + 3 } });
  const cluster = (id: string, date: string, targets: ReturnType<typeof at>[], prId: string) => ({
    commitId: `commit:${id}`,
    rank: 0,
    contradictions: [],
    targets,
    artifacts: [
      {
        id: `commit:${id}`,
        kind: "commit" as const,
        title: id,
        body: id,
        url: "",
        date,
        ref: id,
        meta: { prLookup: "found" },
      },
      { ...prA, id: prId, ref: prId.replace("pr:", "#"), parentId: `commit:${id}` },
    ],
  });
  const clusters: DiffCluster[] = [
    cluster("a000001", "2024-09-20T10:00:00Z", [at("a.ts", 1), at("c.ts", 1)], "pr:1"),
    cluster("a000002", "2024-06-20T10:00:00Z", [at("a.ts", 1), at("b.ts", 1)], "pr:2"),
    cluster("a000003", "2024-03-20T10:00:00Z", [at("b.ts", 1), at("c.ts", 1)], "pr:3"),
  ];
  return verifyDiff(
    { ...SYNTHETIC_PR_COLLECTION, clusters },
    {
      summaryClaims: [],
      findings: clusters.map((_, i) => ({
        cluster: `C${i + 1}`,
        why: "",
        citations: [],
        recorded: false,
      })),
    },
  );
}
