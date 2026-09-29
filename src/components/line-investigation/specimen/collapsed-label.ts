import { enclosingSymbol } from "@understory/core/collect/symbol";
import type { LineRange } from "./types";

const SCAN_LIMIT = 200;
const DEFINITION =
  /\b(?:function|class|interface|enum|struct|trait|def|func|fn|type)\b|=>|\)\s*(?::[^{]*)?\{?\s*$/;
const CALLABLE = new Set(["function", "method"]);

export function symbolInRange(
  lines: string[],
  range: LineRange,
  path: string,
  from: "start" | "end" = "start",
): string | null {
  const scan: number[] = [];
  for (let i = 0; i < Math.min(SCAN_LIMIT, range.end - range.start + 1); i++) {
    scan.push(from === "start" ? range.start + i : range.end - i);
  }
  for (const line of scan) {
    if (!DEFINITION.test(lines[line - 1] ?? "")) continue;
    const symbol = enclosingSymbol(lines, line, path);
    if (!symbol?.name || symbol.start < range.start || symbol.start > range.end) continue;
    return CALLABLE.has(symbol.kind) ? `${symbol.name}()` : symbol.name;
  }
  return null;
}
