import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusGlyph } from "./StatusGlyph";

describe("StatusGlyph", () => {
  it("shows a pending case as a still dashed circle: dashed already says it is not known yet", () => {
    const { container } = render(<StatusGlyph status="pending" />);
    const glyph = container.firstElementChild!;
    expect(glyph.className).toContain("border-dashed");
    expect(glyph.className).not.toMatch(/animate-/);
  });
});
