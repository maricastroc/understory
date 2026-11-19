import { generateKeyPairSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs1", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});

type Minted = { installation: string; repositories: string[] };

let minted: Minted[];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function load() {
  vi.resetModules();
  vi.stubEnv("GITHUB_APP_ID", "12345");
  vi.stubEnv("GITHUB_APP_PRIVATE_KEY", privateKey);
  return import("./github-app");
}

beforeEach(() => {
  minted = [];
  let serial = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      const installation = url.match(/\/repos\/([^/]+)\/[^/]+\/installation$/);
      if (installation) {
        return installation[1].toLowerCase() === "acme" ? json({ id: 7 }) : json({ message: "Not Found" }, 404);
      }
      const tokens = url.match(/\/app\/installations\/(\d+)\/access_tokens$/);
      if (tokens) {
        const { repositories } = JSON.parse(String(init?.body)) as { repositories: string[] };
        minted.push({ installation: tokens[1], repositories });
        serial += 1;
        return json({
          token: `ghs_${repositories.join("_")}_${serial}`,
          expires_at: new Date(Date.now() + 3_600_000).toISOString(),
        });
      }
      throw new Error(`unexpected fetch ${url}`);
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("githubTokenForRepo", () => {
  it("mints a separate token for each repository of the same installation", async () => {
    const { githubTokenForRepo } = await load();

    const payments = await githubTokenForRepo(undefined, "acme/payments");
    const billing = await githubTokenForRepo(undefined, "acme/billing");

    expect(payments).toBe("ghs_payments_1");
    expect(billing).toBe("ghs_billing_2");
    expect(minted).toEqual([
      { installation: "7", repositories: ["payments"] },
      { installation: "7", repositories: ["billing"] },
    ]);
  });

  it("reuses a live token for the same repository", async () => {
    const { githubTokenForRepo } = await load();

    const first = await githubTokenForRepo(undefined, "acme/payments");
    const again = await githubTokenForRepo(undefined, "Acme/Payments");

    expect(again).toBe(first);
    expect(minted).toHaveLength(1);
  });

  it("prefers the user's own token and skips the app", async () => {
    const { githubTokenForRepo } = await load();

    expect(await githubTokenForRepo("ghp_user", "acme/payments")).toBe("ghp_user");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns nothing when the app is not installed on the repository", async () => {
    const { githubTokenForRepo } = await load();

    expect(await githubTokenForRepo(undefined, "other/private")).toBeUndefined();
    expect(minted).toHaveLength(0);
  });
});
