import { readAnswer } from "@understory/core/reading";
import type { DigResult } from "@understory/core/types";
import { describe, expect, it } from "vitest";
import controls from "../fixtures/control-cases.json";
import kept from "../fixtures/kept-cases.json";
import { buildInvestigationView } from "../model/build-investigation-view";
import { whyModel } from "../why/why-model";
import { changeText, passageWhere, qualityText, sourceNamer, whyCopy } from "./why-copy";

const KEPT = kept.cases as unknown as Record<string, DigResult>;
const CONTROLS = controls.cases as unknown as Record<string, DigResult>;
const NOW = Date.parse("2026-10-12T12:00:00Z");

function copied(result: DigResult): string | null {
  const view = buildInvestigationView(result, { now: NOW, reading: true });
  return whyCopy(
    whyModel(readAnswer(result.evidence, result.narrative)!),
    sourceNamer(view.artifacts),
  );
}

describe("where a passage sits", () => {
  it("names the part of a commit, of a pull request, and the place of a review comment", () => {
    expect(
      passageWhere(
        { kind: "commit", name: "18a2e4f" },
        { source: "c", text: "", parts: ["title"] },
      ),
    ).toBe("commit title");
    expect(
      passageWhere(
        { kind: "pull_request", name: "pr:3412" },
        { source: "p", text: "", parts: ["description"] },
      ),
    ).toBe("pr:3412 description");
    expect(
      passageWhere(
        { kind: "review", name: "review·ajafff" },
        {
          source: "r",
          text: "",
          parts: ["review comment"],
          placement: "another file",
          outdated: true,
        },
      ),
    ).toBe("review·ajafff · comment made in another file");
  });

  it("says when a change is the last one or an earlier one, and what it did to the line", () => {
    const at = { id: "commit:22e1399", date: "2024-03-05T10:00:00Z" };
    expect(changeText({ ...at, last: false, did: "rewrote" })).toBe(
      "earlier change · 22e1399 · 5 Mar 2024 · rewrote this line",
    );
    expect(changeText({ ...at, last: true, did: null })).toBe("last change · 22e1399 · 5 Mar 2024");
  });

  it("keeps the audit's three findings apart", () => {
    expect(qualityText("insufficient")).toBe("insufficient: the cited sources do not say this");
    expect(qualityText("refuted")).toBe("refuted: the cited sources say something else");
    expect(qualityText("absent")).toBe("absent: no cited source was checked");
  });
});

describe("Copy the why, with the reading", () => {
  it("keeps what is documented for the line apart from the likely explanations of earlier changes", () => {
    const story = KEPT["ws-revert-story"].narrative!.claims.map((c) => c.text);
    expect(copied(KEPT["ws-revert-story"])).toBe(
      [
        "Documented for this line:",
        `- ${story[2]}`,
        "  9da72fa, the last change, 18 Mar 2024",
        "  commit title, source linked directly to this line",
        "",
        "Likely explanations:",
        `- ${story[1]}`,
        "  05a16a3, an earlier change, 11 Mar 2024",
        "  commit message, said of an earlier change to this line",
        `- ${story[0]}`,
        "  22e1399, an earlier change, 5 Mar 2024",
        "  commit message, said of an earlier change to this line",
      ].join("\n"),
    );
  });

  it("copies the borrowed reason of tslint-189 as what it was classified, a likely explanation said of the change", () => {
    expect(copied(CONTROLS["tslint-189"])).toBe(
      [
        "Likely explanation:",
        `- ${CONTROLS["tslint-189"].narrative!.claims[0].text}`,
        "  8b853b2, the last change, 9 Jan 2018",
        "  pr:3412 description, said of the change as a whole",
      ].join("\n"),
    );
  });

  it("copies nothing where no reason is identified", () => {
    expect(copied(KEPT["tslint-257"])).toBeNull();
    expect(copied(KEPT["ng-http-411"])).toBeNull();
  });

  it("never copies a claim the audit did not credit", () => {
    const result = KEPT["ws-revert-story"];
    const weakened: DigResult = {
      ...result,
      narrative: {
        ...result.narrative!,
        entailment: {
          ...result.narrative!.entailment!,
          checks: result.narrative!.entailment!.checks.map((check) =>
            check.claim === 1 ? { ...check, status: "weak" } : check,
          ),
        },
      },
    };
    const text = copied(weakened)!;
    expect(text).not.toContain(result.narrative!.claims[1].text);
    expect(text).toContain(result.narrative!.claims[0].text);
    expect(text).toContain(result.narrative!.claims[2].text);
  });
});
