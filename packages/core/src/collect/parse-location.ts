import type { CodeLocation } from "../types";

export function parseLocation(raw: string): CodeLocation {
  const at = raw.lastIndexOf(":");
  if (at === -1) {
    throw new Error(`Location must be "file:line" or "file:start-end" (got "${raw}")`);
  }
  const file = raw.slice(0, at);
  const span = raw.slice(at + 1);
  const m = span.match(/^(\d+)(?:[-,](\d+))?$/);
  if (!file || !m) {
    throw new Error(`Bad location "${raw}" — expected e.g. src/app/charge.ts:8 or charge.ts:8-12`);
  }
  const startLine = Number(m[1]);
  const endLine = m[2] ? Number(m[2]) : startLine;
  return { file, startLine, endLine };
}
