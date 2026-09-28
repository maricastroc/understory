import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!("ResizeObserver" in globalThis)) {
  Object.assign(globalThis, { ResizeObserver: ResizeObserverStub });
}

afterEach(() => cleanup());
