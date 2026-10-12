import type { EntailmentStatus } from "@understory/core/types";
import type { RunRecord } from "./eval-report";

export type AuditedClaim = {
  id: string;
  set?: string;
  category?: string;
  source?: string;
  text: string;
  citations: string[];
};

export type RawVerdict = {
  status: EntailmentStatus;
  quote?: string;
  quotes?: string[];
  reason: string;
  code?: string;
  record?: string;
};

export type Expectation = "supported" | "not-supported";

export type WrittenClaim = AuditedClaim & { kind: string; expect: Expectation };

export type ReplayMeta = {
  type: "meta";
  kind: "audit-replay";
  date: string;
  commit: string | null;
  audit: string;
  fallback: string | null;
  repeat: number;
  claims: number;
  from: string[];
  via?: string;
};

export type Judgement = {
  type: "judgement";
  id: string;
  set?: string;
  category?: string;
  source?: string;
  claim: string;
  citations: string[];
  replay: number;
  control: boolean;
  raw: RawVerdict | null;
  status: EntailmentStatus | null;
  quote: string | null;
  fellBack: boolean;
  error?: string;
  kind?: string;
  expect?: Expectation;
};

export const claimKey = (c: { id: string; citations: string[]; text?: string; claim?: string }) =>
  JSON.stringify([c.id, c.text ?? c.claim ?? "", c.citations]);

export function auditedClaims(runs: RunRecord[]): AuditedClaim[] {
  const seen = new Map<string, AuditedClaim>();
  for (const run of runs) {
    const narrative = run.narrative;
    if (!narrative?.entailment?.checked) continue;
    const cited = new Map<number, string[]>();
    for (const check of narrative.entailment.checks) {
      if (check.claim === undefined) continue;
      cited.set(check.claim, [...(cited.get(check.claim) ?? []), check.citation]);
    }
    for (const [index, citations] of cited) {
      const text = narrative.claims[index]?.text;
      if (!text) continue;
      const claim: AuditedClaim = {
        id: run.id,
        set: run.set,
        category: run.category,
        source: run.source,
        text,
        citations,
      };
      if (!seen.has(claimKey(claim))) seen.set(claimKey(claim), claim);
    }
  }
  return [...seen.values()];
}

const RANK: Record<EntailmentStatus, number> = { unsupported: 0, weak: 1, supported: 2 };

export const lowerReading = (statuses: EntailmentStatus[]): EntailmentStatus | null =>
  statuses.length ? statuses.reduce((low, s) => (RANK[s] < RANK[low] ? s : low)) : null;

export type ClaimReadings = {
  key: string;
  id: string;
  category: string;
  source: string;
  claim: string;
  statuses: EntailmentStatus[];
  steady: boolean;
};

export function claimReadings(judgements: Judgement[]): ClaimReadings[] {
  const byClaim = new Map<string, ClaimReadings>();
  for (const j of judgements) {
    if (j.control || !j.status) continue;
    const key = claimKey(j);
    const row = byClaim.get(key) ?? {
      key,
      id: j.id,
      category: j.category || "uncategorised",
      source: j.source || "unlabelled",
      claim: j.claim,
      statuses: [],
      steady: true,
    };
    row.statuses.push(j.status);
    row.steady = new Set(row.statuses).size === 1;
    byClaim.set(key, row);
  }
  return [...byClaim.values()];
}

export type ReplayCounts = {
  claims: number;
  steady: number;
  judged: number;
  errored: number;
  fellBack: number;
  offered: number;
  lost: number;
  supported: number;
  weak: number;
  unsupported: number;
  controls: number;
  controlSupported: number;
};

export function replayCounts(all: Judgement[]): ReplayCounts {
  const judgements = all.filter((j) => !j.kind);
  const real = judgements.filter((j) => !j.control);
  const judged = real.filter((j) => j.status);
  const controls = judgements.filter((j) => j.control && j.status);
  const readings = claimReadings(judgements).filter((r) => r.statuses.length > 1);
  const offered = judged.filter((j) => j.raw?.status === "supported");
  const having = (status: EntailmentStatus) => judged.filter((j) => j.status === status).length;
  return {
    claims: readings.length,
    steady: readings.filter((r) => r.steady).length,
    judged: judged.length,
    errored: real.length - judged.length,
    fellBack: judged.filter((j) => j.fellBack).length,
    offered: offered.length,
    lost: offered.filter((j) => j.status !== "supported").length,
    supported: having("supported"),
    weak: having("weak"),
    unsupported: having("unsupported"),
    controls: controls.length,
    controlSupported: controls.filter((j) => j.status === "supported").length,
  };
}

const share = (part: number, whole: number) =>
  whole ? `${part} of ${whole} (${Math.round((part / whole) * 100)}%)` : "0 of 0";

export function replayLines(all: Judgement[]): string[] {
  const judgements = all.filter((j) => !j.kind);
  if (judgements.length === 0) return [];
  const c = replayCounts(judgements);
  const groups = new Map<string, Judgement[]>();
  for (const j of judgements) {
    const name = `${j.category || "uncategorised"}, ${j.source || "unlabelled"}`;
    groups.set(name, [...(groups.get(name) ?? []), j]);
  }
  return [
    `Claims given the same verdict on every replay: ${share(c.steady, c.claims)}.`,
    ...[...groups].map(([name, rows]) => {
      const g = replayCounts(rows);
      return `  ${name}: ${share(g.steady, g.claims)}`;
    }),
    `Verdicts: ${c.supported} supported, ${c.weak} weak, ${c.unsupported} unsupported over ${c.judged} judgements; ${c.errored} errored.`,
    `Supported verdicts lost to a quote the source does not contain: ${share(c.lost, c.offered)}.`,
    `Judgements answered by the fallback model: ${share(c.fellBack, c.judged)}.`,
    `Control, each claim against another repository's sources: ${share(c.controlSupported, c.controls)} came back supported.`,
  ];
}

export function parseControls(text: string): WrittenClaim[] {
  const file = JSON.parse(text) as { controls?: Array<Partial<WrittenClaim>> };
  return (file.controls ?? []).map((c, at) => {
    const known = c.expect === "supported" || c.expect === "not-supported";
    if (!c.id || !c.text || !c.kind || !known || !c.citations?.length)
      throw new Error(`control ${at + 1} needs id, kind, expect, text and citations`);
    return {
      id: c.id,
      kind: c.kind,
      expect: c.expect as Expectation,
      text: c.text,
      citations: c.citations,
    };
  });
}

const met = (j: Judgement) => (j.status === "supported") === (j.expect === "supported");

export function controlLines(all: Judgement[]): string[] {
  const written = all.filter((j) => j.kind);
  const kinds = [...new Set(written.map((j) => j.kind as string))];
  return kinds.flatMap((kind) => {
    const rows = written.filter((j) => j.kind === kind);
    const judged = rows.filter((j) => j.status);
    const count = (status: EntailmentStatus) => judged.filter((j) => j.status === status).length;
    const claims = new Map<string, Judgement[]>();
    for (const j of judged) claims.set(claimKey(j), [...(claims.get(claimKey(j)) ?? []), j]);
    const missed = [...claims.values()].filter((group) => group.some((j) => !met(j)));
    return [
      `${kind}, expected ${rows[0].expect === "supported" ? "supported" : "not supported"}: ${share(judged.filter(met).length, judged.length)} as expected. ${count("supported")} supported, ${count("weak")} weak, ${count("unsupported")} unsupported; ${rows.length - judged.length} errored.`,
      ...missed.map(
        (group) =>
          `  missed ${group.filter((j) => !met(j)).length} of ${group.length}: ${group[0].id}, "${group[0].claim.slice(0, 80)}"`,
      ),
    ];
  });
}

export function parseReplay(text: string): { meta: ReplayMeta | null; judgements: Judgement[] } {
  const records = text
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as ReplayMeta | Judgement | { type: "usage" });
  return {
    meta: records.find((r): r is ReplayMeta => r.type === "meta") ?? null,
    judgements: records.filter((r): r is Judgement => r.type === "judgement"),
  };
}
