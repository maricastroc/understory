import { enclosingSymbol } from "@git-investigator/core/collect/symbol";
import type { LineRange } from "./types";

const SCAN_LIMIT = 200;
const DEFINITION =
  /\b(?:function|class|interface|enum|struct|trait|def|func|fn|type)\b|=>|\)\s*(?::[^{]*)?\{?\s*$/;
const CALLABLE = new Set(["function", "method"]);

export function symbolInRange(lines: string[], range: LineRange, path: string): string | null {
  const last = Math.min(range.end, range.start + SCAN_LIMIT - 1);
  for (let line = range.start; line <= last; line++) {
    if (!DEFINITION.test(lines[line - 1] ?? "")) continue;
    const symbol = enclosingSymbol(lines, line, path);
    if (!symbol?.name || symbol.start < range.start || symbol.start > range.end) continue;
    return CALLABLE.has(symbol.kind) ? `${symbol.name}()` : symbol.name;
  }
  return null;
}
