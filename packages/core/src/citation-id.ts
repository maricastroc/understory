const BARE_SHA = /^[0-9a-f]{7,40}$/i;
const COMMIT_PREFIX = "commit:";

export function canonicalCitation(id: string, known: ReadonlySet<string>): string {
  if (known.has(id) || !BARE_SHA.test(id)) return id;
  const sha = id.toLowerCase();
  const matches = [...known].filter((candidate) => {
    if (!candidate.startsWith(COMMIT_PREFIX)) return false;
    const full = candidate.slice(COMMIT_PREFIX.length).toLowerCase();
    return full.startsWith(sha) || sha.startsWith(full);
  });
  return matches.length === 1 ? matches[0] : id;
}

export function canonicalCitations(ids: string[], known: ReadonlySet<string>): string[] {
  return ids.map((id) => canonicalCitation(id, known));
}
