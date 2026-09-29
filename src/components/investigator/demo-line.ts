import { parseLocation } from "@understory/core/collect/parse-location";

export function demoLine(raw: string | null | undefined): { path: string; line: number } | null {
  if (!raw?.trim()) return null;
  try {
    const at = parseLocation(raw.trim());
    return { path: at.file, line: at.startLine };
  } catch {
    return null;
  }
}
