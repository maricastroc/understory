export const API_ERROR_CODES = [
  "not-found",
  "rate-limited",
  "busy",
  "too-large",
  "ai-unavailable",
  "owner-not-repo",
  "not-a-repository",
  "git-unavailable",
  "server",
  "network",
  "no-evidence",
  "failed",
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export type Host = "GitHub" | "GitLab";

export type ApiFailure = {
  code: ApiErrorCode;
  detail: string | null;
  host?: Host;
  retryAfter?: number;
  installUrl?: string;
};

const PROVIDER_STATUS = /\b(GitHub|GitLab) (?:API|GraphQL) (\d{3})\b/;

export function providerFailure(message: string): Pick<ApiFailure, "code" | "host"> {
  if (message.startsWith("Not a git repository:")) return { code: "not-a-repository" };
  const match = PROVIDER_STATUS.exec(message);
  if (!match) return { code: "failed" };
  const host = match[1] as Host;
  const status = Number(match[2]);
  if (status === 429) return { code: "rate-limited", host };
  if (host === "GitHub" && status === 403) return { code: "rate-limited", host };
  if (status === 404) return { code: "not-found", host };
  if (host === "GitLab" && (status === 401 || status === 403)) return { code: "not-found", host };
  if (status >= 500) return { code: "server", host };
  return { code: "failed", host };
}

const isCode = (value: unknown): value is ApiErrorCode =>
  typeof value === "string" && (API_ERROR_CODES as readonly string[]).includes(value);

const isHost = (value: unknown): value is Host => value === "GitHub" || value === "GitLab";

type FailureBody = {
  error?: unknown;
  detail?: unknown;
  code?: unknown;
  host?: unknown;
  installUrl?: unknown;
};

export function failureFrom(res: Response, body: unknown): ApiFailure {
  const b = (body && typeof body === "object" ? body : {}) as FailureBody;
  const fallback: ApiErrorCode =
    res.status === 429 ? "busy" : res.status >= 500 ? "server" : "failed";
  const code = isCode(b.code) ? b.code : fallback;
  const text = typeof b.detail === "string" ? b.detail : b.error;
  const detail = typeof text === "string" && text.trim() ? text : null;
  const retryAfter = Number(res.headers.get("Retry-After"));
  return {
    code,
    detail: detail ?? (code === "server" ? `HTTP ${res.status}` : null),
    ...(isHost(b.host) ? { host: b.host } : {}),
    ...(code === "busy" && retryAfter > 0 ? { retryAfter } : {}),
    ...(typeof b.installUrl === "string" && b.installUrl ? { installUrl: b.installUrl } : {}),
  };
}

export const NETWORK_FAILURE: ApiFailure = { code: "network", detail: null };

export function thrownFailure(err: unknown): ApiFailure {
  const detail = err instanceof Error ? err.message : String(err);
  return { code: "failed", detail: detail || null };
}
