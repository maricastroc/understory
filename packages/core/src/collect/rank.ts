export const RECENT_COMMITS = 12;

const SOURCE = /\.(ts|tsx|js|jsx|mjs|py|go|rs|c|cc|cpp|h|hpp|java|rb|php|swift|kt|scala|cs|mm?)$/;
const ENTRY = /^(index|main|app|mod|lib|server)\./;
const NOISE = /\.(lock|map|svg|png|jpe?g|ico|gif|webp|woff2?|min\.js|d\.ts)$/;
const TEST =
  /(^|[./-])(tests?|specs?|__tests__|__mocks__|e2e|fixtures?)([./-]|$)|\.(test|spec)\.[jt]sx?$/i;

export function isNoise(path: string): boolean {
  return NOISE.test(basename(path));
}

const basename = (p: string): string => {
  const parts = p.split("/");
  return (parts[parts.length - 1] ?? "").toLowerCase();
};

function shallowScore(p: string): number {
  const base = basename(p);

  let s = p.split("/").length * 4;

  if (SOURCE.test(base)) s -= 30;

  if (ENTRY.test(base)) s -= 8;

  if (NOISE.test(base)) s += 50;
  return s;
}

export function rankShallow(paths: string[], limit = 10): string[] {
  return [...paths]
    .sort((a, b) => shallowScore(a) - shallowScore(b) || a.localeCompare(b))
    .slice(0, limit);
}

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
