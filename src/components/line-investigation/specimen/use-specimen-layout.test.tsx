import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SPECIMEN_LAYOUTS, useSpecimenLayout } from "./use-specimen-layout";

function viewport(width: number) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: width >= Number(query.match(/\d+/)![0]),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("useSpecimenLayout", () => {
  it.each([
    [1440, SPECIMEN_LAYOUTS.wide],
    [1360, SPECIMEN_LAYOUTS.wide],
    [1280, SPECIMEN_LAYOUTS.narrow],
    [1100, SPECIMEN_LAYOUTS.narrow],
    [960, SPECIMEN_LAYOUTS.strip],
    [820, SPECIMEN_LAYOUTS.strip],
    [390, SPECIMEN_LAYOUTS.compact],
  ])("maps a %ipx viewport to the handoff's layout", (width, expected) => {
    viewport(width);
    const { result } = renderHook(() => useSpecimenLayout());
    expect(result.current).toBe(expected);
  });
});
