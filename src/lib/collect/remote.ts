import { NextResponse } from "next/server";

function collectorHosts(): Set<string> {
  return new Set(
    (process.env.COLLECTOR_HOSTS ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function repoHost(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  let m = s.match(/^https?:\/\/([^/]+)/i);
  if (m) return m[1].toLowerCase();
  if ((m = s.match(/^git@([^:]+):/))) return m[1].toLowerCase();
  if (/^[\w.-]+\/[\w.-]+$/.test(s) && !s.startsWith(".") && !s.startsWith("~")) return "github.com";
  return null;
}

function shouldDelegate(repoInput: string): boolean {
  const target = process.env.COLLECTOR_URL;
  if (!target) return false;
  const host = repoHost(repoInput);
  return !!host && collectorHosts().has(host);
}

function forwardHeaders(req: Request, withBody: boolean): Record<string, string> {
  const h: Record<string, string> = {};
  const secret = process.env.COLLECTOR_SECRET;
  if (secret) h["x-collector-secret"] = secret;
  for (const name of ["x-github-token", "x-gitlab-token"]) {
    const v = req.headers.get(name);
    if (v) h[name] = v;
  }
  if (withBody) h["content-type"] = "application/json";
  return h;
}

/**
 * On the Vercel instance, forwards a provider-bound request to the on-prem
 * collector when the repo host is behind the firewall. Returns null when the
 * request should be handled in-process (the normal GitHub / local path, and
 * everything on the collector instance itself).
 */
export async function maybeDelegate(
  req: Request,
  repoInput: string,
  body?: unknown,
): Promise<Response | null> {
  if (!shouldDelegate(repoInput)) return null;

  const src = new URL(req.url);
  const target = `${process.env.COLLECTOR_URL!.replace(/\/$/, "")}${src.pathname}${src.search}`;
  const init: RequestInit = {
    method: req.method,
    headers: forwardHeaders(req, body !== undefined),
  };
  if (body !== undefined) init.body = JSON.stringify(body);

  let res: Response;
  try {
    res = await fetch(target, init);
  } catch {
    return NextResponse.json(
      { error: "The on-prem collector is unreachable — check the tunnel and COLLECTOR_URL." },
      { status: 502 },
    );
  }

  return new Response(await res.text(), {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
}

/**
 * On the collector instance, rejects any request that doesn't carry the shared
 * secret. Set COLLECTOR_INBOUND_SECRET only on the private backend (which has no
 * public UI); leave it unset on the Vercel instance.
 */
export function collectorAuthError(req: Request): Response | null {
  const expected = process.env.COLLECTOR_INBOUND_SECRET;
  if (!expected) return null;
  if (req.headers.get("x-collector-secret") === expected) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
