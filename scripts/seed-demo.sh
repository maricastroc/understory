#!/usr/bin/env bash
# Seeds a local demo repo the UI can investigate out of the box.
# Mirrors the mockup's charge.ts history. Target is gitignored (/.demo).
#
#   npm run seed:demo
#
# Then in the app, investigate: src/billing/charge.ts:8
set -euo pipefail

DIR="${1:-.demo/payments-service}"
rm -rf "$DIR"
mkdir -p "$DIR/src/billing"
cd "$DIR"

git init -q
git config user.name "demo"
git config user.email "demo@example.com"

commit () { # commit <ISO-date> <author-name> <author-email> <message>
  GIT_AUTHOR_NAME="$2"  GIT_AUTHOR_EMAIL="$3"  GIT_AUTHOR_DATE="$1" \
  GIT_COMMITTER_NAME="$2" GIT_COMMITTER_EMAIL="$3" GIT_COMMITTER_DATE="$1" \
  git commit -q -m "$4"
}

# ---- v1: unbounded retry loop --------------------------------------------
cat > src/billing/charge.ts <<'EOF'
import { stripe } from "../lib/stripe";
import { sleep } from "../lib/sleep";
import type { ChargeRequest } from "./types";

export async function chargeCustomer(req: ChargeRequest) {
  while (true) {
    try {
      return await stripe.charges.create(req);
    } catch (err) {
      await sleep(1000);
    }
  }
}
EOF
git add -A
commit "2023-09-03T10:00:00" "Priya Nair" "priya@acme.dev" \
  "billing: add chargeCustomer with retry-on-failure

Wraps the Stripe call in a retry loop so transient network blips
don't drop a payment. Retries until it succeeds."

cat > src/billing/refund.ts <<'EOF'
export async function refundCharge(id: string) {
  return { id, refunded: true };
}
EOF
git add -A
commit "2023-10-11T09:30:00" "Priya Nair" "priya@acme.dev" \
  "billing: add refundCharge helper"

# ---- v2: bound the retries to 3 with exponential backoff (THE decision) ---
cat > src/billing/charge.ts <<'EOF'
import { stripe } from "../lib/stripe";
import { sleep } from "../lib/sleep";
import { ChargeFailedError } from "./errors";
import type { ChargeRequest } from "./types";

export async function chargeCustomer(req: ChargeRequest) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await stripe.charges.create(req);
    } catch (err) {
      await sleep(2 ** attempt * 1000);
    }
  }
  throw new ChargeFailedError(req.id);
}
EOF
git add -A
commit "2023-11-27T14:12:00" "Elena Ruiz" "elena@acme.dev" \
  "billing: bound charge retries with exponential backoff

INC-1187: the unbounded loop resubmitted charges during a Stripe
outage and double-billed 214 customers. Cap retries at 3 (1s/2s/4s)
so a charge resolves inside Stripe's 10s webhook ACK window.

Reviewed-by: Dmitri Sokolov <dmitri@acme.dev>
Refs: #812, #1187"

# ---- v3: add jitter to the backoff ---------------------------------------
cat > src/billing/charge.ts <<'EOF'
import { stripe } from "../lib/stripe";
import { sleep } from "../lib/sleep";
import { ChargeFailedError } from "./errors";
import { jitter } from "../lib/jitter";
import type { ChargeRequest } from "./types";

export async function chargeCustomer(req: ChargeRequest) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await stripe.charges.create(req);
    } catch (err) {
      await sleep(2 ** attempt * 1000 + jitter());
    }
  }
  throw new ChargeFailedError(req.id);
}
EOF
git add -A
commit "2023-12-08T11:45:00" "Elena Ruiz" "elena@acme.dev" \
  "billing: add jitter to retry backoff

Stops recovering clients from retrying in lockstep after an outage.
Retry ceiling of 3 is unchanged. Follow-up to #812."

echo "✓ demo repo ready at $DIR"
echo "  investigate:  src/billing/charge.ts:8"
