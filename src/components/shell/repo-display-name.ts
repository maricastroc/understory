import { basename } from "../format";

export function repoDisplayName(name: string): string {
  const trimmed = name.trim();
  return /^(\/|~|\.|[a-z]:\\)/i.test(trimmed) ? basename(trimmed.replace(/\\/g, "/")) : trimmed;
}
