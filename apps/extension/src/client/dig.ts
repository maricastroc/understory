import type { DigResult, DigStreamMessage, Evidence } from "@understory/core";
import { DigError } from "./errors";
import type { DigRequest } from "./types";

const NO_EVIDENCE = "The backend finished without sending any evidence.";
const NO_FINAL = "The backend stopped before sending the written answer.";

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

  const streamed = !!res.body && (res.headers.get("content-type") ?? "").includes("ndjson");
  try {
    return streamed ? await readStream(res.body!) : ((await res.json()) as DigResult);
  } catch (e) {
    if (signal.aborted) throw new DigError("cancelled", "Investigation cancelled.");
    throw e;
  }
}

async function readStream(body: ReadableStream<Uint8Array>): Promise<DigResult> {
  let evidence: Evidence | undefined;
  for await (const msg of messages(body)) {
    if (msg.phase === "evidence") {
      evidence = msg.evidence;
    } else if (msg.phase === "final") {
      if (!evidence) throw new DigError("unknown", msg.error || NO_EVIDENCE);
      return {
        evidence,
        narrative: msg.narrative,
        ...(msg.error ? { error: msg.error } : {}),
      };
    }
  }
  if (!evidence) throw new DigError("unknown", NO_EVIDENCE);
  return { evidence, narrative: null, error: NO_FINAL };
}

async function* messages(body: ReadableStream<Uint8Array>): AsyncGenerator<DigStreamMessage> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let nl = buf.indexOf("\n");
      while (nl >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (line) yield JSON.parse(line) as DigStreamMessage;
        nl = buf.indexOf("\n");
      }
    }
    const tail = (buf + decoder.decode()).trim();
    if (tail) yield JSON.parse(tail) as DigStreamMessage;
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}
