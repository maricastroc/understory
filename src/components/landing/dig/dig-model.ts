import type { InvestigationView, ViewArtifact } from "../../line-investigation/model/types";
import { datumToken } from "../../line-investigation/specimen/datum-token";
import type { LineVersion } from "../demo/strata/types";
import type { DigModel, DigRecord } from "./types";

const DAY = 86_400_000;

function excerpt(a: ViewArtifact): string | null {
  const body = a.source.body.trim();
  const rest = body.startsWith(a.source.title) ? body.slice(a.source.title.length).trim() : body;
  return rest === "" ? null : rest;
}

export function monthsBetween(newer: string, older: string): string[] {
  const from = new Date(newer);
  const to = new Date(older);
  const floor = to.getUTCFullYear() * 12 + to.getUTCMonth();
  const out: string[] = [];
  for (let m = from.getUTCFullYear() * 12 + from.getUTCMonth() - 1; m > floor; m--) {
    out.push(new Date(Date.UTC(Math.floor(m / 12), m % 12, 1)).toISOString().slice(0, 10));
  }
  return out;
}

export function digModel(
  view: InvestigationView,
  lines: string[],
  versions: LineVersion[],
  now: number,
): DigModel {
  const line = view.location?.startLine ?? 1;
  const raw = lines[line - 1] ?? "";
  const indent = raw.length - raw.trimStart().length;
  const found = datumToken(view.question, raw);
  const token = found ? { start: found.start - indent, end: found.end - indent } : null;
  const versionOf = new Map(
    versions.map((v) => [v.artifactId, { ...v, text: v.text.slice(indent) }]),
  );
  const dated = view.artifacts
    .filter((a) => a.onBore && !Number.isNaN(Date.parse(a.date)))
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

  const record = (artifact: ViewArtifact): DigRecord => ({
    artifact,
    excerpt: excerpt(artifact),
    quote: artifact.quotes.find((q) => q.range !== null) ?? null,
    clause: view.clauses.find((c) => c.citations[0] === artifact.id) ?? null,
    version: versionOf.get(artifact.id) ?? null,
  });

  const first = dated.findIndex((a) => a.kind === "commit");
  const proof = dated.findIndex((a) => a.kind === "issue");
  const origin = dated.at(-1);
  const gap = view.gaps.find((g) => g.verified && g.afterId === origin?.id);
  if (first < 0 || proof <= first || !origin || !gap)
    throw new Error("the landing case needs a commit, an issue below it and a silent origin");

  return {
    path: view.location?.file ?? "",
    line,
    code: raw.slice(indent),
    indent,
    token,
    column: token ? (token.start + token.end) / 2 : 0.5,
    question: view.question,
    first: record(dated[first]),
    trail: dated.slice(first + 1, proof).map(record),
    proof: record(dated[proof]),
    origin: record(origin),
    gap,
    unchangedDays: (now - Date.parse(dated[first].date)) / DAY,
    silentDays: (Date.parse(dated[proof].date) - Date.parse(origin.date)) / DAY,
    silentMonths: monthsBetween(dated[proof].date, origin.date),
    clauses: view.clauses,
    quoted: view.clauses.flatMap((c) => {
      for (const a of dated) {
        const quote = a.quotes.find((q) => q.clauseId === c.id && q.range !== null);
        if (quote) return [{ letter: a.letter, text: quote.text }];
      }
      return [];
    }),
  };
}
