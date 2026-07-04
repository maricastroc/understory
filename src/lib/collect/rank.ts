const SOURCE = /\.(ts|tsx|js|jsx|mjs|py|go|rs|c|cc|cpp|h|hpp|java|rb|php|swift|kt|scala|cs|mm?)$/;
const ENTRY = /^(index|main|app|mod|lib|server)\./;
const NOISE = /\.(lock|map|svg|png|jpe?g|ico|gif|webp|woff2?|min\.js|d\.ts)$/;

/** Order a file list so representative source files surface first — for default Find suggestions. */
export function rankShallow(paths: string[], limit = 10): string[] {
  const score = (p: string): number => {
    const parts = p.split("/");
    const base = (parts[parts.length - 1] ?? "").toLowerCase();
    let s = parts.length * 4; // mild preference for shallower paths
    if (SOURCE.test(base)) s -= 30; // strongly prefer real source over docs/config
    if (/^readme(\.|$)/.test(base)) s -= 20;
    if (ENTRY.test(base)) s -= 8;
    if (NOISE.test(base)) s += 50; // push lockfiles, assets, generated types down
    return s;
  };
  return [...paths].sort((a, b) => score(a) - score(b) || a.localeCompare(b)).slice(0, limit);
}
