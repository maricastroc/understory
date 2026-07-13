export type PrSpec = { owner: string; repo: string; number: number };

// Accepts a GitHub PR URL (…/owner/repo/pull/123, with any trailing path/query)
// or the short "owner/repo#123" form.
export function parsePr(input: string): PrSpec | null {
  const s = input.trim();

  const url = s.match(/github\.com\/([\w.-]+)\/([\w.-]+)\/pull\/(\d+)/i);
  if (url) return { owner: url[1], repo: stripGit(url[2]), number: Number(url[3]) };

  const short = s.match(/^([\w.-]+)\/([\w.-]+)#(\d+)$/);
  if (short) return { owner: short[1], repo: stripGit(short[2]), number: Number(short[3]) };

  return null;
}

function stripGit(repo: string): string {
  return repo.replace(/\.git$/, "");
}
