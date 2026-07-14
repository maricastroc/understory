import { owningCommit } from "./provenance";
import type { Artifact, Evidence } from "./types";

// High-precision markers that a commit is a formatting / lint / refactor / rename change
// rather than a behavioural one. Deliberately conservative: a false negative just misses a
// cosmetic commit, but a false positive would wrongly caveat a substantive change — so keep
// the net tight and only ever CAP confidence (never lower a medium/low), and phrase the
// caveat as a possibility.
const COSMETIC =
  /\b(?:prettier|eslint|lint(?:ing|s)?|whitespace|indentation|re-?indent(?:ed|ing)?|reformat(?:ted|ting)?|formatting|code[-\s]?style|refactor(?:ed|ing|s)?|renam(?:e|es|ed|ing))\b/i;
const PREFIX = /^\s*(?:style|refactor)(?:\([^)]*\))?:/i;

export function looksCosmetic(subject: string): boolean {
  const line = subject.split("\n", 1)[0];
  return PREFIX.test(line) || COSMETIC.test(line);
}

// When the line's most recent change reads as cosmetic, blame is pointing at the janitor, not
// the architect — the original rationale is likely an earlier change (present in the timeline
// on the local git-log-L path, or missing entirely on the forge blame path). Returns that
// commit so callers can name it in a caveat; null when the owner is a substantive change,
// there is no owner, or it is not a line investigation.
export function cosmeticOrigin(ev: Evidence): Artifact | null {
  const owner = owningCommit(ev);
  return owner && looksCosmetic(owner.title) ? owner : null;
}
