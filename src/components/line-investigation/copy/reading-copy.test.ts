import type { LineageStop } from "@understory/core/types";
import { describe, expect, it } from "vitest";
import { earlierCaption, edgeText, factText, scopeText } from "./reading-copy";

describe("what a change did to the line", () => {
  it("says what the diff shows, and nothing about why", () => {
    expect(factText({ did: "added", before: null }, "en")).toBe("added this line");
    expect(factText({ did: "rewrote", before: "return true;" }, "en")).toBe("rewrote this line");
    expect(factText({ did: "respaced", before: "  return x;" }, "en")).toBe(
      "changed only the spacing of this line",
    );
  });
});

describe("the scope of a quoted passage", () => {
  it("keeps a source linked to the line apart from one said of the change or of an earlier one", () => {
    expect(scopeText({ scope: "line" }, "en")).toBe("source linked directly to this line");
    expect(scopeText({ scope: "change" }, "en")).toBe("said of the change as a whole");
    expect(scopeText({ scope: "earlier change" }, "en")).toBe(
      "said of an earlier change to this line",
    );
    expect(scopeText({ scope: "file" }, "en")).toBe("from the file's history, not this line's");
  });

  it("says where a review comment was made, without turning it away", () => {
    expect(scopeText({ scope: "line", placement: "on the line", outdated: false }, "en")).toBe(
      "source linked directly to this line · comment made on this line",
    );
    expect(scopeText({ scope: "change", placement: "in its hunk", outdated: false }, "en")).toBe(
      "said of the change as a whole · comment made near this line",
    );
    expect(scopeText({ scope: "change", placement: "same file, elsewhere" }, "en")).toBe(
      "said of the change as a whole · comment made elsewhere in this file",
    );
    expect(scopeText({ scope: "change", placement: "another file", outdated: false }, "en")).toBe(
      "said of the change as a whole · comment made in another file",
    );
  });

  it("says when the comment sits on a version the change later replaced", () => {
    expect(scopeText({ scope: "change", placement: "in its hunk", outdated: true }, "en")).toBe(
      "said of the change as a whole · comment made near this line, on an earlier version",
    );
    expect(scopeText({ scope: "change", placement: "another file", outdated: true }, "en")).toBe(
      "said of the change as a whole · comment made in another file",
    );
  });
});

describe("changes found by following the line back", () => {
  it("are captioned as history, not as a reason", () => {
    expect(earlierCaption("en")).toBe("found by following the line back · not read for a reason");
  });
});

describe("where the history shown ends", () => {
  it("says nothing where the line's first change is in view", () => {
    expect(edgeText(null, "the line", "en")).toBeNull();
    expect(edgeText("the line was added", "the line", "en")).toBeNull();
  });

  it("says the earlier history was not read, and why when the walk stopped", () => {
    expect(edgeText("not read", "the line", "en")).toBe(
      "The line's history before this was not read.",
    );
    const why: Record<Exclude<LineageStop, "the line was added">, string> = {
      "depth limit": "this view follows only a few changes back",
      "request limit": "this view follows only a few changes back",
      "time limit": "following it took too long",
      "no patch": "the host did not return the change",
      "line not located": "the line could not be followed through the change",
      quota: "the host's request allowance was low",
      cancelled: "the investigation was cancelled",
    };
    for (const [stop, reason] of Object.entries(why))
      expect(edgeText(stop as LineageStop, "the line", "en")).toBe(
        `The line's history before this was not read: ${reason}.`,
      );
  });

  it("says a file's history is not the line's, whatever the walk did", () => {
    const note = "These are changes to the file. The line's own history could not be read.";
    expect(edgeText("not read", "the file", "en")).toBe(note);
    expect(edgeText(null, "the file", "en")).toBe(note);
  });
});
