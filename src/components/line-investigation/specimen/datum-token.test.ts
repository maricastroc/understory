import { describe, expect, it } from "vitest";
import { datumToken } from "./datum-token";

const LINE = "  for (let attempt = 0; attempt < 3; attempt++) {";
const slice = (line: string, r: { start: number; end: number } | null) =>
  r ? line.slice(r.start, r.end) : null;

describe("datumToken", () => {
  it("boxes the literal the question asks about", () => {
    expect(slice(LINE, datumToken("Why exactly 3 retries?", LINE))).toBe("3");
    expect(datumToken("Why exactly 3 retries?", LINE)?.start).toBe(LINE.indexOf("< 3") + 2);
  });

  it("does not match a number inside a larger one", () => {
    const line = "const limit = 30; const ratio = 0.3;";
    expect(datumToken("Why 3?", line)).toBeNull();
  });

  it("matches dotted, camelCase, snake_case and backticked identifiers", () => {
    const line = "  const key = req.id ?? makeKey(MAX_RETRIES, retry_budget);";
    expect(slice(line, datumToken("Why is the key req.id?", line))).toBe("req.id");
    expect(slice(line, datumToken("Where does makeKey come from?", line))).toBe("makeKey");
    expect(slice(line, datumToken("Why MAX_RETRIES here?", line))).toBe("MAX_RETRIES");
    expect(slice(line, datumToken("Why retry_budget?", line))).toBe("retry_budget");
    expect(slice(line, datumToken("Why `key`?", line))).toBe("key");
  });

  it("highlights the whole row instead when the question names nothing on the line", () => {
    expect(datumToken("Why is this line the way it is?", LINE)).toBeNull();
    expect(datumToken("Why does the retry exist?", LINE)).toBeNull();
  });

  it("takes the first literal of the question that is actually on the line", () => {
    const line = "  sleep(2 ** attempt * 1000);";
    expect(slice(line, datumToken("Why 7 and not 1000?", line))).toBe("1000");
  });
});
