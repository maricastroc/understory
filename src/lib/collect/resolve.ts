import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);

const CACHE_ROOT = path.join(process.cwd(), ".cache", "repos");
const inflight = new Map<string, Promise<ResolvedRepo>>();

export type ResolvedRepo = { path: string; kind: "local" | "remote"; slug?: string };

const isUrl = (s: string) => /^(https?:\/\/|git@|ssh:\/\/)/.test(s);
const isShorthand = (s: string) =>
  /^[\w.-]+\/[\w.-]+$/.test(s) && !s.startsWith(".") && !s.startsWith("/") && !s.startsWith("~");

function toRemote(input: string): { url: string; slug: string } | null {
  if (isUrl(input)) {
    const m = input.match(/[:/]([\w.-]+\/[\w.-]+?)(?:\.git)?\/?$/);
    return { url: input, slug: m ? m[1] : input };
  }
  if (isShorthand(input)) return { url: `https://github.com/${input}.git`, slug: input };
  return null;
}

export async function resolveRepoInput(input: string): Promise<ResolvedRepo> {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("No repository given");

  const remote = toRemote(trimmed);
  if (!remote) {
    const abs = path.isAbsolute(trimmed) ? trimmed : path.resolve(process.cwd(), trimmed);
    return { path: abs, kind: "local" };
  }

  const dir = path.join(CACHE_ROOT, remote.slug);
  if (existsSync(path.join(dir, ".git"))) {
    return { path: dir, kind: "remote", slug: remote.slug };
  }

  if (!inflight.has(dir)) {
    const job = (async (): Promise<ResolvedRepo> => {
      const depth = process.env.CLONE_DEPTH ?? "150";
      try {
        await exec("git", ["clone", "--depth", depth, "--single-branch", "--no-tags", remote.url, dir], {
          env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
          timeout: 110_000,
          maxBuffer: 64 * 1024 * 1024,
        });
      } catch (e) {
        await rm(dir, { recursive: true, force: true }).catch(() => {});
        const err = e as { killed?: boolean; message?: string };
        const msg = err.message ?? String(e);
        if (err.killed || /ETIMEDOUT|timed out/i.test(msg)) {
          throw new Error(
            `Cloning ${remote.url} timed out (>110s). It may be a very large repo — try a smaller one, or clone it locally and pass the path.`,
          );
        }
        const auth = /authentication|denied|not found|403|could not read|repository not found/i.test(msg);
        throw new Error(
          `Could not clone ${remote.url}. ` +
            (auth
              ? "If it's private, the server needs git credentials (e.g. `gh auth login` or a credential helper)."
              : (msg.split("\n").filter(Boolean).slice(-1)[0] ?? "clone failed")),
        );
      }
      return { path: dir, kind: "remote", slug: remote.slug };
    })().finally(() => inflight.delete(dir));
    inflight.set(dir, job);
  }
  return inflight.get(dir)!;
}
