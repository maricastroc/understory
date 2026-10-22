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
