const SHA = /^[0-9a-f]{7,40}$/i;

export function isCommitSha(value: string): boolean {
  return SHA.test(value);
}
