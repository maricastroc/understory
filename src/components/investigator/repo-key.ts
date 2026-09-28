const GITHUB =
  /^(?:https?:\/\/github\.com\/|git@github\.com:)?([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/i;

export function repoKey(input: string): string {
  const s = input.trim();
  if (!s.startsWith(".") && !s.startsWith("/") && !s.startsWith("~")) {
    const m = s.match(GITHUB);
    if (m) return `${m[1]}/${m[2]}`.toLowerCase();
  }
  return s.replace(/\/+$/, "");
}
