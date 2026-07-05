# Evaluation harness

A small gold set that runs the **real** pipeline (`collect → synthesize → verify`) end
to end and checks the product's promises hold: a grounded _why_ when the history records
one, honest abstention when it doesn't, and a refusal when the question is out of scope.

## Run

```bash
npm run seed:demo          # build the deterministic .demo/payments-service fixture
npm run eval               # single pass
npm run eval -- --repeat 5 # run each case 5× to measure LLM variance
npm run eval -- retry-cap  # run one case by id
```

Needs `GROQ_API_KEY` in `.env.local` (synthesis is the one AI step). Exits non-zero if any
run fails, so it can gate CI.

## What it checks

Assertions are **structural**, not exact prose — robust to the model's wording and to
re-seeding:

| Field            | Meaning                                                          |
| ---------------- | --------------------------------------------------------------- |
| `answerable`     | Is the question in scope for this code's history?               |
| `recorded`       | Did the evidence actually explain it (vs. honest abstention)?   |
| `grounded`       | Every citation resolves to a collected artifact (no fabrication) |
| `minScore`       | Confidence floor                                                |
| `citesBodyMatch` | At least one cited source's body matches this regex             |

The gold set lives in [`gold.json`](gold.json): four answered cases, one where the history
is genuinely silent, and three out-of-scope questions.

## Why it exists

Two payoffs. First, it's a regression guard for the behaviour that _is_ the product. Second,
it settled a design question empirically: the out-of-scope check is done inside the single
synthesis call rather than a separate classifier — the eval confirms that call refuses
out-of-scope questions **15/15** across repeats, so the extra round-trip isn't warranted.
