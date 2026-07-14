import { owningCommit } from "./provenance";
import type { Artifact, Evidence } from "./types";

const COSMETIC =
  /\b(?:prettier|eslint|lint(?:ing|s)?|whitespace|indentation|re-?indent(?:ed|ing)?|reformat(?:ted|ting)?|formatting|code[-\s]?style|refactor(?:ed|ing|s)?|renam(?:e|es|ed|ing))\b/i;
const PREFIX = /^\s*(?:style|refactor)(?:\([^)]*\))?:/i;

export function looksCosmetic(subject: string): boolean {
  const line = subject.split("\n", 1)[0];
  return PREFIX.test(line) || COSMETIC.test(line);
}

export function cosmeticOrigin(ev: Evidence): Artifact | null {
  const owner = owningCommit(ev);
  return owner && looksCosmetic(owner.title) ? owner : null;
}
