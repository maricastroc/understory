import { describe, expect, it } from "vitest";
import {
  commitArtifact,
  issueArtifact,
  prArtifact,
  reviewArtifact,
} from "./collect/github/artifacts";
import { type Comment, foldComments } from "./collect/github/comments";
import { DISCUSSION, partsOf, segmentsOf } from "./record-part";
import type { Artifact } from "./types";

const said = (login: string, body: string): Comment => ({
  author: { login },
  body,
  createdAt: "2024-01-10T00:00:00Z",
});

const commit = (message: string): Artifact =>
  commitArtifact({
    oid: "a".repeat(40),
    abbreviatedOid: "aaaaaaa",
    messageHeadline: message.split("\n")[0],
    message,
    url: "",
    committedDate: "2024-01-01T00:00:00Z",
    author: null,
  });

const pull = (body: string, thread: Comment[]): Artifact => {
  const pr = prArtifact({
    number: 7,
    title: "Add a cache",
    body,
    url: "",
    createdAt: "2024-01-01T00:00:00Z",
  });
  return { ...pr, body: foldComments(pr.body, thread) };
};

describe("the parts of a collected record", () => {
  it("follow the mark the collector writes before a folded discussion", () => {
    expect(foldComments("header", [said("ana", "a comment")])).toContain(DISCUSSION);
  });

  it("are a commit's title and the rest of its message", () => {
    const c = commit("Add a cache\n\nIt keeps the last page so the next poll starts there.");
    expect(segmentsOf(c).map((s) => s.part)).toEqual(["title", "message"]);
    expect(partsOf(c, "Add a cache")).toEqual(["title"]);
    expect(partsOf(c, "It keeps the last page")).toEqual(["message"]);
  });

  it("are a pull request's title, its description and the discussion under it", () => {
    const pr = pull("It keeps the last page.", [said("ana", "Why a cache at all?")]);
    expect(segmentsOf(pr).map((s) => s.part)).toEqual(["title", "description", "discussion"]);
    expect(partsOf(pr, "Add a cache")).toEqual(["title"]);
    expect(partsOf(pr, "It keeps the last page.")).toEqual(["description"]);
    expect(partsOf(pr, "Why a cache at all?")).toEqual(["discussion"]);
  });

  it("are the same for an issue", () => {
    const issue = issueArtifact({
      number: 9,
      title: "Slow on large pages",
      body: "It takes a minute to load.",
      url: "",
      createdAt: "2024-01-01T00:00:00Z",
    });
    const folded = { ...issue, body: foldComments(issue.body, [said("ana", "Same here, twice.")]) };
    expect(partsOf(folded, "Slow on large pages")).toEqual(["title"]);
    expect(partsOf(folded, "It takes a minute to load.")).toEqual(["description"]);
    expect(partsOf(folded, "Same here, twice.")).toEqual(["discussion"]);
  });

  it("are a review's summary and its comments", () => {
    const review = reviewArtifact(
      7,
      "",
      {
        author: { login: "ana" },
        state: "COMMENTED",
        body: "",
        submittedAt: "2024-01-02T00:00:00Z",
      },
      0,
    );
    const inline = [said("ana", "This check is redundant.")];
    expect(
      partsOf({ ...review, body: foldComments("", inline) }, "This check is redundant."),
    ).toEqual(["review comment"]);
    expect(partsOf({ ...review, body: "Looks good overall." }, "Looks good overall.")).toEqual([
      "review summary",
    ]);
    const both = { ...review, body: foldComments("Looks good overall.", inline) };
    expect(partsOf(both, "Looks good overall.")).toEqual(["review summary"]);
    expect(partsOf(both, "This check is redundant.")).toEqual(["review comment"]);
  });

  it("name every part a passage runs across, none for a passage that is not there, and leave out an empty part", () => {
    const c = commit("Add a cache\n\nIt keeps the last page.");
    expect(partsOf(c, "Add a cache It keeps the last page.")).toEqual(["title", "message"]);
    expect(partsOf(c, "It drops the last page.")).toEqual([]);
    expect(segmentsOf(pull("", [said("ana", "Why a cache at all?")])).map((s) => s.part)).toEqual([
      "title",
      "discussion",
    ]);
  });
});
