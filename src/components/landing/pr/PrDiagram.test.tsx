import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "@/test/axe";
import { PrDiagram } from "./PrDiagram";

describe("PrDiagram", () => {
  it("is one image with a description and no hit targets", async () => {
    const { container } = render(<PrDiagram />);
    const img = screen.getByRole("img", {
      name: "6 changed regions: 4 share one pull request, 2 end in unrecorded history",
    });
    expect(img.querySelectorAll("button, a, [tabindex]")).toHaveLength(0);
    expect(img.textContent).toContain("pr:1020 · shared by R1–R4");
    expect(img.textContent).toContain("not recorded");
    expect(img.querySelectorAll("rect.stroke-li-gap")).toHaveLength(2);
    expect((await axe(container)).violations).toEqual([]);
  });
});
