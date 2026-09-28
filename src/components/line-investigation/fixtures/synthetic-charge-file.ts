import type { BlameSpan } from "@git-investigator/core/types";

export const SYNTHETIC_FILE_PATH = "src/billing/charge.ts";

export const syntheticChargeLines = [
  'import Stripe from "stripe";',
  'import { sleep } from "../lib/sleep";',
  'import { logger } from "../lib/log";',
  "",
  "const stripe = new Stripe(env.STRIPE_KEY);",
  "",
  "/** Retried only on transient Stripe errors. */",
  "export async function chargeCustomer(req) {",
  "  for (let attempt = 0; attempt < 3; attempt++) {",
  "    try {",
  "      return await stripe.charges.create(req);",
  "    } catch (err) {",
  "      if (!isTransient(err)) throw err;",
  '      logger.warn("retry", { attempt, id });',
  "      await sleep(2 ** attempt * 1000);",
  "    }",
  "  }",
  "  throw new ChargeFailed(req.id);",
  "}",
  "",
  "function isTransient(err) {",
  '  return err.statusCode >= 500 || err.code === "ECONNRESET";',
  "}",
  "export { isTransient };",
];

const commit = (short: string, date: string, author: string) => ({
  sha: short.padEnd(40, "0"),
  shortSha: short,
  date,
  author,
});

const ORIGIN = commit("7be210e", "2021-06-18T14:02:00Z", "Leo Park");
const CAP = commit("92f6a3f", "2023-03-15T16:20:00Z", "Priya Raman");
const LOGGING = commit("a19d3f2", "2024-02-20T10:00:00Z", "Sam Ortiz");
const IDEMPOTENT = commit("c0a41e9", "2023-08-20T10:00:00Z", "Ana Lima");
const TRANSIENT = commit("5e77b20", "2022-01-15T10:00:00Z", "Leo Park");

const OWNERS = [
  ORIGIN,
  ORIGIN,
  LOGGING,
  ORIGIN,
  ORIGIN,
  ORIGIN,
  CAP,
  ORIGIN,
  CAP,
  ORIGIN,
  IDEMPOTENT,
  ORIGIN,
  TRANSIENT,
  LOGGING,
  CAP,
  ORIGIN,
  ORIGIN,
  CAP,
  ORIGIN,
  TRANSIENT,
  TRANSIENT,
  TRANSIENT,
  TRANSIENT,
  TRANSIENT,
];

export const syntheticChargeBlame: BlameSpan[] = OWNERS.reduce<BlameSpan[]>((spans, owner, i) => {
  const line = i + 1;
  const last = spans[spans.length - 1];
  if (last && last.sha === owner.sha) {
    last.endLine = line;
    return spans;
  }
  return [...spans, { startLine: line, endLine: line, ...owner }];
}, []);
