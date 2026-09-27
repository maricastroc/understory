export function githubRepoKey(owner: string, repo: string): string {
  return `github:${owner.toLowerCase()}/${repo.toLowerCase()}`;
}

export function localRepoKey(path: string): string {
  return `local:${path}`;
}
