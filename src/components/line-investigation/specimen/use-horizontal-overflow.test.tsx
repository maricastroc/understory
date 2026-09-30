import { render, screen } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { useHorizontalOverflow } from "./use-horizontal-overflow";

let content = 0;
const CLIENT = 400;
const descriptors = {
  scrollWidth: Object.getOwnPropertyDescriptor(Element.prototype, "scrollWidth"),
  clientWidth: Object.getOwnPropertyDescriptor(Element.prototype, "clientWidth"),
};

function Scroller({ width }: { width: number }) {
  const [ref, overflowing] = useHorizontalOverflow();
  return (
    <div
      ref={ref}
      data-width={width}
      tabIndex={overflowing ? 0 : undefined}
      role={overflowing ? "region" : undefined}
      aria-label="Code lines"
    >
      <ol />
    </div>
  );
}

beforeAll(() => {
  Object.defineProperty(Element.prototype, "scrollWidth", {
    configurable: true,
    get: () => content,
  });
  Object.defineProperty(Element.prototype, "clientWidth", {
    configurable: true,
    get: () => CLIENT,
  });
});

afterAll(() => {
  for (const [name, descriptor] of Object.entries(descriptors)) {
    if (descriptor) Object.defineProperty(Element.prototype, name, descriptor);
  }
});

describe("useHorizontalOverflow", () => {
  it("becomes focusable in the same render that makes it overflow", () => {
    content = CLIENT;
    const { container, rerender } = render(<Scroller width={460} />);
    const scroller = container.firstElementChild!;
    expect(scroller.hasAttribute("tabindex")).toBe(false);

    content = CLIENT + 40;
    rerender(<Scroller width={420} />);
    expect(scroller.getAttribute("tabindex")).toBe("0");
    expect(screen.getByRole("region", { name: "Code lines" })).toBe(scroller);

    content = CLIENT;
    rerender(<Scroller width={460} />);
    expect(scroller.hasAttribute("tabindex")).toBe(false);
  });
});
