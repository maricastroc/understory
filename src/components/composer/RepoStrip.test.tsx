import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "@/test/axe";
import { syntheticMeta, syntheticOverview } from "./fixtures/synthetic-overview";
import { SYNTHETIC_MAP_STATES } from "./fixtures/synthetic-histories";
import { RepoStrip } from "./RepoStrip";

function setup() {
  return render(
    <RepoStrip
      repoPath="acme/payments-service"
      meta={syntheticMeta}
      overview={syntheticOverview}
      map={SYNTHETIC_MAP_STATES.partial()}
    />,
  );
}

describe("RepoStrip", () => {
  it("shows the repository, branch and HEAD on one line with details collapsed", () => {
    setup();
    const strip = within(screen.getByRole("region", { name: "Repository" }));
    expect(strip.getByText("/ main")).toBeTruthy();
    expect(strip.getByText("HEAD 4e1d0a2")).toBeTruthy();
    const toggle = strip.getByRole("button", { name: /^Details/ });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(strip.queryByText("in the tree at HEAD")).toBeNull();
  });

  it("reveals the full metadata on demand", () => {
    setup();
    const strip = within(screen.getByRole("region", { name: "Repository" }));
    fireEvent.click(strip.getByRole("button", { name: /^Details/ }));
    const toggle = strip.getByRole("button", { name: /^Hide details/ });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(document.getElementById(toggle.getAttribute("aria-controls")!)!.hidden).toBe(false);
    expect(strip.getByText("in the tree at HEAD")).toBeTruthy();
    expect(strip.getByText("1,284")).toBeTruthy();
  });

  it("passes axe with details open", async () => {
    const { container } = setup();
    fireEvent.click(screen.getByRole("button", { name: /^Details/ }));
    expect((await axe(container)).violations).toEqual([]);
  });
});
