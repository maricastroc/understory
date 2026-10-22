import { describe, expect, it } from "vitest";
import { formatSeconds } from "./format";

describe("format", () => {
  it("writes a wait in seconds with the right plural", () => {
    expect(formatSeconds("en", 1)).toBe("1 second");
    expect(formatSeconds("en", 20)).toBe("20 seconds");
    expect(formatSeconds("pt-BR", 1)).toBe("1 segundo");
    expect(formatSeconds("pt-BR", 20)).toBe("20 segundos");
  });
});
