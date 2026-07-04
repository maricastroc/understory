const SOURCE = /\.(ts|tsx|js|jsx|mjs|py|go|rs|c|cc|cpp|h|hpp|java|rb|php|swift|kt|scala|cs|mm?)$/;
const ENTRY = /^(index|main|app|mod|lib|server)\./;
const NOISE = /\.(lock|map|svg|png|jpe?g|ico|gif|webp|woff2?|min\.js|d\.ts)$/;
const TEST = /(^|[./-])(tests?|specs?|__tests__|__mocks__|e2e|fixtures?)([./-]|$)|\.(test|spec)\.[jt]sx?$/i;

const basename = (p: string): string => {
  const parts = p.split("/");
  return (parts[parts.length - 1] ?? "").toLowerCase();
};

/** Structural fitness of a path as an investigation target — lower is better. */
function shallowScore(p: string): number {
  const base = basename(p);
  let s = p.split("/").length * 4; // mild preference for shallower paths
  if (SOURCE.test(base)) s -= 30; // strongly prefer real source over docs/config
  if (/^readme(\.|$)/.test(base)) s -= 20;
  if (ENTRY.test(base)) s -= 8;
  if (NOISE.test(base)) s += 50; // push lockfiles, assets, generated types down
  return s;
}

/** Order a file list so representative source files surface first — for default Find suggestions. */
export function rankShallow(paths: string[], limit = 10): string[] {
  return [...paths]
    .sort((a, b) => shallowScore(a) - shallowScore(b) || a.localeCompare(b))
    .slice(0, limit);
}

/**
 * Order files by how layered their recent history is — files touched by more recent
 * commits make the richest "why is this line here?" targets, since a line with several
 * commits behind it yields multiple sources to cite (and thus higher confidence).
 * Only real source files with any churn are eligible; tests and noise are dropped.
 */
export function rankByHistory(paths: string[], churn: Map<string, number>, limit = 5): string[] {
  return paths
    .filter((p) => {
      const base = basename(p);
      return SOURCE.test(base) && !NOISE.test(base) && !TEST.test(p) && (churn.get(p) ?? 0) > 0;
    })
    .sort(
      (a, b) =>
        (churn.get(b) ?? 0) - (churn.get(a) ?? 0) ||
        shallowScore(a) - shallowScore(b) ||
        a.localeCompare(b),
    )
    .slice(0, limit);
}
