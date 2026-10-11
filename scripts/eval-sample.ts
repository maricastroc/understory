import { existsSync } from "node:fs";
import {
  getFileContentGitHub,
  getRepoMeta,
  parseGitHubRepo,
} from "@understory/core/collect/github";

const proc = process as NodeJS.Process & { loadEnvFile?: (path?: string) => void };
if (existsSync(".env.local")) proc.loadEnvFile?.(".env.local");

export function seedOf(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function sampleLines(source: string, key: string, count: number): number[] {
  const eligible = source
    .split("\n")
    .map((text, i) => ({ line: i + 1, text }))
    .filter((l) => /[\p{L}\p{N}]/u.test(l.text))
    .map((l) => l.line);
  const next = mulberry32(seedOf(key));
  const target = Math.min(count, eligible.length);
  const picked: number[] = [];
  while (picked.length < target) {
    const at = Math.floor(next() * eligible.length);
    picked.push(eligible.splice(at, 1)[0]);
  }
  return picked.sort((a, b) => a - b);
}

async function main() {
  const [repoArg, path, countArg] = process.argv.slice(2);
  const repo = parseGitHubRepo(repoArg ?? "");
  if (!repo || !path) {
    console.error("usage: npm run eval:sample -- owner/repo path/to/file [count]");
    process.exit(1);
  }
  const meta = await getRepoMeta(repo.owner, repo.repo);
  const source = await getFileContentGitHub(repo.owner, repo.repo, meta.branch, path);
  const lines = source.split("\n");
  const key = `${repo.owner}/${repo.repo}:${path}`;
  for (const line of sampleLines(source, key, Number(countArg) || 2)) {
    console.log(`${key}:${line}\t${lines[line - 1].trim()}`);
  }
}

if (process.argv[1]?.endsWith("eval-sample.ts")) void main();
