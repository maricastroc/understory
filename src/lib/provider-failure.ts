import { GitHubApiError } from "@understory/core/collect/github/client";
import type { ApiFailure, Host } from "./api-error";

type Classified = Pick<ApiFailure, "code" | "host">;

const PROVIDER_STATUS = /\b(GitHub|GitLab) (?:API|GraphQL) (\d{3})\b/;

function byStatus(host: Host, status: number, rateLimited: boolean): Classified {
  if (rateLimited || status === 429) return { code: "rate-limited", host };
  if (status === 404) return { code: "not-found", host };
  if (host === "GitLab" && status === 401) return { code: "not-found", host };
  if (status >= 500) return { code: "server", host };
  return { code: "failed", host };
}

export function providerFailure(error: unknown): Classified {
  if (error instanceof GitHubApiError) return byStatus("GitHub", error.status, error.rateLimited);
  const message = error instanceof Error ? error.message : String(error);
  if (message.startsWith("Not a git repository:")) return { code: "not-a-repository" };
  const match = PROVIDER_STATUS.exec(message);
  if (!match) return { code: "failed" };
  return byStatus(match[1] as Host, Number(match[2]), false);
}
