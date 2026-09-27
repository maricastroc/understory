import { describe, expect, it } from "vitest";
import { parseDrillRef } from "./drill-link";

describe("parseDrillRef", () => {
  it("reads an artifact reference from the drill link", () => {
    expect(
      parseDrillRef(
        JSON.stringify({ kind: "pull_request", id: "pr:1020", ref: "#1020", number: 1020 }),
      ),
    ).toEqual({ kind: "pull_request", id: "pr:1020", ref: "#1020", number: 1020 });
  });

  it("rejects anything that is not a known artifact reference", () => {
    expect(parseDrillRef(null)).toBeNull();
    expect(parseDrillRef("not json")).toBeNull();
    expect(parseDrillRef(JSON.stringify({ kind: "script", id: "x" }))).toBeNull();
    expect(parseDrillRef(JSON.stringify({ kind: "commit", id: 42 }))).toBeNull();
  });
});
