import { describe, expect, it } from "vitest";
import { SYNTHETIC_NOW, syntheticRetryCap } from "../fixtures/synthetic-retry-cap";
import * as states from "../fixtures/synthetic-states";
import { buildInvestigationView } from "../model/build-investigation-view";
import { artifactName, gapName } from "./accessible-name";
import { dateLine, depthText, displayId, labelTitle, tickText } from "./artifact-copy";
import { clauseDescription, tallyText } from "./clause-copy";
import { artifactStatus, citesText, contextLines, metaLine } from "./drawer-copy";
import { evidenceEntries } from "./evidence-entries";
import { gapBody, gapLabel, gapLetter } from "./gap-copy";
import { checklistText } from "./verdict-copy";

const now = new Date(SYNTHETIC_NOW);
const view = buildInvestigationView(syntheticRetryCap, { now });
const art = (id: string) => view.artifacts.find((a) => a.id === id)!;
const byId = new Map(view.artifacts.map((a) => [a.id, a]));

describe("artifact copy", () => {
  it("shows short ids the way the handoff labels them", () => {
    expect(displayId(art("commit:92f6a3f"))).toBe("92f6a3f");
    expect(displayId(art("pr:812"))).toBe("pr:812");
    expect(displayId(art("review:812-1"))).toBe("review·dmitri-k");
    expect(displayId(art("issue:1187"))).toBe("issue:1187");
  });

  it("gives PRs an open → merge interval and reviews their state", () => {
    expect(dateLine(art("pr:812"))).toBe("open 9 → 15 Mar 2023");
    expect(dateLine(art("issue:1187"))).toBe("2 Mar 2023");
    expect(labelTitle(art("review:812-1"))).toBe("Changes requested");
    expect(labelTitle(art("commit:92f6a3f"))).toBe("Cap charge retries at 3, add backoff");
  });

  it("formats depth from today", () => {
    expect(depthText(art("commit:92f6a3f").daysBeforeNow)).toBe("−3y 6m");
    expect(tickText(art("commit:7be210e").daysBeforeNow!)).toBe("−5.3y");
    expect(tickText(40)).toBe("−1m");
    expect(depthText(null)).toBe("undated");
  });
});

describe("gaps", () => {
  it("uses ∅ only for gaps the record supports", () => {
    const [verified] = view.gaps;
    expect([gapLetter(verified), gapLabel(verified)]).toEqual(["∅", "not recorded"]);
    const [unverified] = buildInvestigationView(states.syntheticWithoutStageFourData(), {
      now,
    }).gaps;
    expect([gapLetter(unverified), gapLabel(unverified)]).toEqual(["?", "not verified"]);
    expect(gapBody(unverified, art("commit:7be210e"))).toMatch(/not verified/);
  });

  it("lists every artifact plus gaps in depth order", () => {
    expect(evidenceEntries(view).map((e) => e.id)).toEqual([
      "commit:92f6a3f",
      "review:812-1",
      "review:812-0",
      "pr:812",
      "issue:1187",
      "commit:7be210e",
      "gap:pull_request:commit:7be210e",
    ]);
  });
});

describe("clause copy", () => {
  it("tallies sources and verification honestly", () => {
    expect(view.clauses.map(tallyText)).toEqual([
      "2 sources · 1 verified",
      "2 sources · 1 verified",
      "2 sources · 1 verified",
    ]);
    const weak = buildInvestigationView(states.syntheticWeak(), { now });
    expect(tallyText(weak.clauses[1])).toBe("2 sources · weak support");
    const fab = buildInvestigationView(states.syntheticFabricated(), { now });
    expect(tallyText(fab.clauses[1])).toBe("1 source · not audited · 1 not collected");
    const silent = buildInvestigationView(states.syntheticNotRecorded(), { now });
    expect(tallyText(silent.clauses[0])).toBe("no reason on record");
  });

  it("describes the evidence relation as text for screen readers", () => {
    expect(clauseDescription(view.clauses[1], byId)).toBe(
      "Supported by E, issue issue:1187; D, pull request pr:812. 1 quote verified.",
    );
  });
});

describe("accessible names", () => {
  it("reads a label the way the handoff specifies", () => {
    expect(artifactName(art("pr:812"), view.clauses)).toBe(
      "D, pull request pr:812, open 9 → 15 Mar 2023, cited by clause 1 and 2",
    );
    expect(artifactName(art("issue:1187"), view.clauses)).toBe(
      "E, issue issue:1187, 2 Mar 2023, cited by clause 2, quote verified",
    );
    expect(gapName(view.gaps[0], art("commit:7be210e"))).toBe(
      "Not recorded: no pull request, review or issue before commit 7be210e",
    );
    const issueGap = {
      ...view.gaps[0],
      id: "gap:issue:pr:812",
      missing: "issue" as const,
      afterId: "pr:812",
    };
    expect(gapName(issueGap, art("pr:812"))).toBe("No linked issue on pull request pr:812");
  });
});

describe("drawer copy", () => {
  it("states what each artifact contributes", () => {
    expect(artifactStatus(art("issue:1187"), view.clauses)).toEqual({
      text: "✓ Quote found verbatim in source",
      tone: "evidence",
    });
    expect(artifactStatus(art("commit:7be210e"), view.clauses).text).toBe(
      "Supporting · not cited by any clause",
    );
    expect(citesText(art("pr:812"), view.clauses)).toBe("Supports clause 1 and clause 2");
  });

  it("derives context only from recorded edges and lookups", () => {
    expect(contextLines(art("pr:812"), view.artifacts)).toEqual([
      "Closes issue:1187",
      "Merged 15 Mar 2023",
    ]);
    expect(contextLines(art("commit:7be210e"), view.artifacts)).toEqual([
      "No pull request references this commit",
    ]);
    expect(metaLine(art("commit:92f6a3f"), view.artifacts)).toBe("Priya Raman · merged via pr:812");
  });
});

describe("verdict checklist copy", () => {
  it("renders the checks", () => {
    expect(view.checklist.map(checklistText)).toEqual([
      "3 of 3 clauses rest on recorded sources",
      "5 of 5 citations resolve to real artifacts",
      "3 quotes found verbatim, 0 misattributed",
    ]);
  });
});
