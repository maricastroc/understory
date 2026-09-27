import type { FileHistory, PrLookup } from "../../types";
import { knownLookups, readSummaries, rememberLookups, writeSummary } from "./history-cache";
import { type BlameSummary, type SpanLike, summarizeSpans, withLookups } from "./summarize";

export const MAX_MAP_FILES = 5;
export const MAX_MAP_BYTES = 400_000;

export type HistorySource = {
  key: string;
  blame: (ref: string, paths: string[]) => Promise<Map<string, SpanLike[] | Error>>;
  lookups: ((oids: string[]) => Promise<Map<string, PrLookup>>) | null;
  maxLookups: number;
};

export type MapFile = { path: string; blobSha: string; size: number | null };

const settled = (v: PrLookup) => v === "found" || v === "none";

function toHistory(f: MapFile, s: BlameSummary): FileHistory {
  return {
    path: f.path,
    blobSha: f.blobSha,
    status: "mapped",
    lineCount: s.lineCount,
    marks: s.marks,
    cut: s.marks.some((m) => m.boundary),
  };
}

function withoutHistory(f: MapFile, status: "unavailable" | "too-large", error?: string) {
  const out: FileHistory = {
    path: f.path,
    blobSha: f.blobSha,
    status,
    lineCount: 0,
    marks: [],
    cut: false,
  };
  if (error) out.error = error;
  return out;
}

async function blameMisses(
  source: HistorySource,
  ref: string,
  files: MapFile[],
): Promise<Map<string, SpanLike[] | Error>> {
  if (files.length === 0) return new Map();
  try {
    return await source.blame(
      ref,
      files.map((f) => f.path),
    );
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return new Map(files.map((f) => [f.path, err]));
  }
}

async function resolveLookups(
  source: HistorySource,
  summaries: Iterable<BlameSummary>,
): Promise<Map<string, PrLookup>> {
  const open = new Set<string>();
  for (const s of summaries) for (const m of s.marks) if (!settled(m.prLookup)) open.add(m.sha);
  const lookups = knownLookups(source.key, [...open]);
  const ask = [...open].filter((oid) => !lookups.has(oid)).slice(0, source.maxLookups);
  if (!source.lookups || ask.length === 0) return lookups;
  try {
    const found = await source.lookups(ask);
    rememberLookups(source.key, found);
    for (const [oid, v] of found) lookups.set(oid, v);
  } catch {
    for (const oid of ask) lookups.set(oid, "failed");
  }
  return lookups;
}

export async function mapHistories(
  source: HistorySource,
  ref: string,
  files: MapFile[],
  mode: "cached" | "map",
): Promise<FileHistory[]> {
  const hits = await readSummaries(source.key, files);
  if (mode === "cached") {
    return files.filter((f) => hits.has(f.path)).map((f) => toHistory(f, hits.get(f.path)!));
  }

  const batch = files.slice(0, MAX_MAP_FILES);
  const results = new Map<string, FileHistory>();
  const summaries = new Map<string, BlameSummary>();
  const misses: MapFile[] = [];
  for (const f of batch) {
    const hit = hits.get(f.path);
    if (hit) summaries.set(f.path, hit);
    else if (f.size !== null && f.size > MAX_MAP_BYTES) {
      results.set(f.path, withoutHistory(f, "too-large"));
    } else misses.push(f);
  }

  const blamed = await blameMisses(source, ref, misses);
  for (const f of misses) {
    const spans = blamed.get(f.path);
    if (!spans || spans instanceof Error) {
      results.set(f.path, withoutHistory(f, "unavailable", spans?.message));
    } else {
      summaries.set(f.path, summarizeSpans(spans));
    }
  }

  const lookups = await resolveLookups(source, summaries.values());
  for (const f of batch) {
    const s = summaries.get(f.path);
    if (!s) continue;
    const next = withLookups(s, lookups);
    await writeSummary(source.key, f.path, f.blobSha, next);
    results.set(f.path, toHistory(f, next));
  }
  return batch.map((f) => results.get(f.path)).filter((h): h is FileHistory => !!h);
}
