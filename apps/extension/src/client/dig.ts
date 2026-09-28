import type { DigResult } from "@git-investigator/core";
import { DigError } from "./errors";
import type { DigRequest } from "./types";

export async function runDig(
  backendUrl: string,
  request: DigRequest,
  signal: AbortSignal,
  githubToken?: string,
): Promise<DigResult> {
  const url = `${backendUrl}/api/dig`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(githubToken ? { "x-github-token": githubToken } : {}),
      },
      body: JSON.stringify(request),
      signal,
    });
  } catch (e) {
    if (signal.aborted) throw new DigError("cancelled", "Investigation cancelled.");
    const detail = e instanceof Error ? e.message : String(e);
    throw new DigError("offline", `Could not reach the backend at ${url}. (${detail})`);
  }

  if (!res.ok) {
    let detail = "";
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) detail = ` — ${data.error}`;
    } catch {
      //
    }
    throw new DigError("http", `Backend returned ${res.status}${detail}`);
  }

  return (await res.json()) as DigResult;
}
