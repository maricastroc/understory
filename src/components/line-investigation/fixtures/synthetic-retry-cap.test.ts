import { describe, expect, it } from "vitest";
import { locateQuote, verifyQuote } from "@understory/core/quote";
import { verify } from "@understory/core/verify";
import {
  syntheticEntailment,
  syntheticEvidence,
  syntheticNarrative,
  syntheticRetryCap,
} from "./synthetic-retry-cap";
import * as states from "./synthetic-states";

const byId = new Map(syntheticEvidence.artifacts.map((a) => [a.id, a]));

describe("synthetic retry-cap fixture", () => {
  it("is labelled synthetic and never points at a real repository", () => {
    expect(syntheticEvidence.repo.name).toMatch(/^synthetic\//);
    expect(syntheticEvidence.repo.path).toMatch(/synthetic/);
    for (const a of syntheticEvidence.artifacts) {
      expect(new URL(a.url).hostname).toBe("git.example.com");
    }
  });

  it("keeps the collector's ordering: oldest artifact first", () => {
    const dates = syntheticEvidence.artifacts.map((a) => a.date);
    expect(dates).toEqual([...dates].sort((a, b) => a.localeCompare(b)));
  });

  it("only cites artifacts that exist", () => {
    for (const id of syntheticNarrative.citations) expect(byId.has(id)).toBe(true);
  });

  it("carries at most one verified quote per claim, each a real substring of its source", () => {
    const perClaim = new Map<number, number>();
    for (const c of syntheticEntailment.checks) {
      if (!c.quote) continue;
      perClaim.set(c.claim!, (perClaim.get(c.claim!) ?? 0) + 1);
      const body = byId.get(c.citation)!.body;
      expect(verifyQuote(body, c.quote)).toBe(c.quote);
      expect(locateQuote(body, c.quote)).not.toBeNull();
    }
    expect([...perClaim.values()].every((n) => n === 1)).toBe(true);
  });

  it("derives its confidence from verify(), not from a hand-written value", () => {
    const recomputed = verify(syntheticEvidence, syntheticNarrative, syntheticEntailment);
    expect(syntheticRetryCap.narrative?.confidence).toEqual(recomputed.confidence);
    expect(syntheticRetryCap.narrative?.confidence.level).toBe("high");
  });

  it("records lookup outcomes that agree with the chain edges", () => {
    for (const a of syntheticEvidence.artifacts) {
      const children = syntheticEvidence.artifacts.filter((x) => x.parentId === a.id);
      if (a.kind === "commit") {
        const hasPr = children.some((x) => x.kind === "pull_request");
        expect(a.meta?.prLookup).toBe(hasPr ? "found" : "none");
      }
      if (a.kind === "pull_request") {
        expect(a.meta?.reviewLookup).toBe(
          children.some((x) => x.kind === "review") ? "found" : "none",
        );
        expect(a.meta?.issueLookup).toBe(
          children.some((x) => x.kind === "issue") ? "found" : "none",
        );
      }
    }
  });
});

describe("synthetic state variants", () => {
  it("produce the honesty states they are named after", () => {
    expect(states.syntheticEvidenceOnly().narrative).toBeNull();
    expect(states.syntheticNotRecorded().narrative).toMatchObject({ recorded: false, claims: [] });
    expect(states.syntheticOutOfScope().narrative).toMatchObject({ answerable: false });
    expect(states.syntheticFabricated().narrative).toMatchObject({
      grounded: false,
      unknownCitations: ["commit:deadbee"],
    });
    expect(states.syntheticUncited().narrative?.ungroundedClaims).toBe(1);
    expect(states.syntheticMisattributed().narrative?.entailment?.misattributed).toBe(1);
    expect(
      states.syntheticWeak().narrative?.entailment?.checks.some((c) => c.status === "weak"),
    ).toBe(true);
    expect(states.syntheticUnaudited().narrative?.entailment).toBeUndefined();
    expect(states.syntheticUnaudited().narrative?.confidence.level).toBe("medium");
    expect(states.syntheticContradicted().narrative?.confidence.contradicting).toBe(1);
    expect(states.syntheticFileGranularity().evidence.coverage).toEqual({ granularity: "file" });
  });

  it("strip every stage-4 field for the persisted-before-stage-4 variant", () => {
    const { evidence } = states.syntheticWithoutStageFourData();
    expect(evidence.repo).not.toHaveProperty("sha");
    for (const a of evidence.artifacts) {
      for (const k of ["prLookup", "reviewLookup", "issueLookup", "mergedAt", "state"]) {
        expect(a.meta ?? {}).not.toHaveProperty(k);
      }
    }
  });

  it("model the legacy shapes older saved cases can have", () => {
    expect(states.syntheticLegacyNoEdges().evidence.artifacts.some((a) => a.parentId)).toBe(false);
    expect(
      states
        .syntheticLegacyCitationChecks()
        .narrative?.entailment?.checks.every((c) => c.claim === undefined),
    ).toBe(true);
    expect(states.syntheticLegacyNoClaims().narrative).not.toHaveProperty("claims");
  });
});
