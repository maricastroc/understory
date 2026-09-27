import type { PrClause, PrRegion } from "../model/types";
import { listOf } from "./region-copy";

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function clauseTally(clause: PrClause, regions: PrRegion[]): string {
  const cited = regions.filter((r) => clause.regions.includes(r.id));
  if (clause.silent) return `${plural(cited.length, "region")} · no reason on record`;
  const explained = cited.filter((r) => r.state === "explained").length;
  if (cited.length === 0) return "no region mapped";
  return `${plural(cited.length, "region")} · ${explained} explained`;
}

export function clauseRests(clause: PrClause, regions: PrRegion[]): string {
  const cited = regions.filter((r) => clause.regions.includes(r.id));
  if (cited.length === 0) return "No changed region is cited by this clause.";
  const ids = cited.map((r) => r.id);
  if (clause.silent) return `Rests on ${listOf(ids)}, not recorded.`;
  const silent = cited.filter((r) => r.state !== "explained").map((r) => r.id);
  if (silent.length === 0) {
    return `Rests on ${listOf(ids)}, ${cited.length === 1 ? "explained" : "all explained"}.`;
  }
  return `Rests on ${listOf(ids)}; ${listOf(silent)} not fully recorded.`;
}
