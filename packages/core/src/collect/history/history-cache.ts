import type { PrLookup } from "../../types";
import type { BlameSummary } from "./summarize";

export type HistoryStore = {
  getMany(keys: string[]): Promise<Array<string | null>>;
  set(key: string, value: string): Promise<void>;
};

const MEMORY_LIMIT = 4000;
const memory = new Map<string, string>();
const prMemory = new Map<string, "found" | "none">();
let persistent: HistoryStore | null = null;

export function setPersistentHistoryStore(store: HistoryStore | null): void {
  persistent = store;
}

export function clearHistoryMemory(): void {
  memory.clear();
  prMemory.clear();
}

function remember(key: string, value: string) {
  memory.delete(key);
  memory.set(key, value);
  if (memory.size > MEMORY_LIMIT) {
    const oldest = memory.keys().next().value;
    if (oldest !== undefined) memory.delete(oldest);
  }
}

const summaryKey = (repo: string, path: string, blob: string) => `blame:${repo}:${blob}:${path}`;
const prKey = (repo: string, oid: string) => `${repo}:${oid}`;

export async function readSummaries(
  repo: string,
  files: Array<{ path: string; blobSha: string }>,
): Promise<Map<string, BlameSummary>> {
  const out = new Map<string, BlameSummary>();
  const missing: Array<{ path: string; key: string }> = [];
  for (const f of files) {
    const key = summaryKey(repo, f.path, f.blobSha);
    const hit = memory.get(key);
    if (hit !== undefined) out.set(f.path, JSON.parse(hit) as BlameSummary);
    else missing.push({ path: f.path, key });
  }
  if (persistent && missing.length) {
    try {
      const values = await persistent.getMany(missing.map((m) => m.key));
      values.forEach((value, i) => {
        if (value === null) return;
        remember(missing[i].key, value);
        out.set(missing[i].path, JSON.parse(value) as BlameSummary);
      });
    } catch {
      //
    }
  }
  return out;
}

export async function writeSummary(
  repo: string,
  path: string,
  blobSha: string,
  summary: BlameSummary,
): Promise<void> {
  const key = summaryKey(repo, path, blobSha);
  const value = JSON.stringify(summary);
  remember(key, value);
  for (const m of summary.marks) {
    if (m.prLookup === "found" || m.prLookup === "none")
      prMemory.set(prKey(repo, m.sha), m.prLookup);
  }
  if (persistent) await persistent.set(key, value).catch(() => {});
}

export function knownLookups(repo: string, oids: string[]): Map<string, PrLookup> {
  const out = new Map<string, PrLookup>();
  for (const oid of oids) {
    const hit = prMemory.get(prKey(repo, oid));
    if (hit) out.set(oid, hit);
  }
  return out;
}

export function rememberLookups(repo: string, lookups: ReadonlyMap<string, PrLookup>): void {
  for (const [oid, value] of lookups) {
    if (value === "found" || value === "none") prMemory.set(prKey(repo, oid), value);
  }
}
