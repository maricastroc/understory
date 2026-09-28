import type { FileHistory, ShownFile } from "@git-investigator/core/types";

export async function requestHistories(input: {
  repo: string;
  ref: string;
  files: ShownFile[];
  mode: "cached" | "map";
  token?: string;
  signal: AbortSignal;
}): Promise<FileHistory[]> {
  const res = await fetch("/api/history-map", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(input.token ? { "x-github-token": input.token } : {}),
    },
    body: JSON.stringify({
      repo: input.repo,
      ref: input.ref,
      mode: input.mode,
      files: input.files.map((f) => ({ path: f.path, blobSha: f.blobSha, size: f.size })),
    }),
    signal: input.signal,
    priority: "low",
  } as RequestInit);
  if (!res.ok) throw new Error(`history map ${res.status}`);
  const data = (await res.json()) as { files?: FileHistory[] };
  return data.files ?? [];
}
