# Evaluation harness

A small gold set that runs the **real** pipeline end to end — `collect`, then the same
`narrate` step the app uses (`synthesize → entail → verify`) — and checks the product's
promises hold: a grounded _why_ when the history records one, honest abstention when it
doesn't, and a refusal when the question is out of scope.

## Run

```bash
npm run seed:demo                     # build the deterministic .demo/payments-service fixture
npm run eval                          # single pass
npm run eval -- --repeat 5            # run each case 5× to measure LLM variance
npm run eval -- --repeat 5 --delay 2000  # pace the runs for the free tier's tokens-per-minute limit
npm run eval -- retry-cap jitter      # run some cases by id
```

Needs `GROQ_API_KEY` in `.env.local`. It calls the core directly, so the web app's daily AI
limit does not apply. It is not part of CI, which runs without a model key. It exits non-zero
if any run fails or errors.

## What it checks

Assertions are **structural**, not exact prose — robust to the model's wording and to
re-seeding:

| Field            | Meaning                                                          |
| ---------------- | ---------------------------------------------------------------- |
| `answerable`     | Is the question in scope for this code's history?                |
| `recorded`       | Did the evidence actually explain it (vs. honest abstention)?    |
| `grounded`       | Every citation resolves to a collected artifact (no fabrication) |
| `minScore`       | Confidence floor                                                 |
| `level`          | Exact confidence level                                           |
| `citesBodyMatch` | At least one cited source's body or title matches this regex     |

The gold set lives in [`gold.json`](gold.json): four answered cases, one where the history
is genuinely silent, and three out-of-scope questions.

A run that ends in an API error (a rate limit, a timeout) is reported as **errored** and left
out of the pass rate: it says nothing about the model's answer.

## Results

29 Sep 2026 · synthesis `openai/gpt-oss-120b` · audit `openai/gpt-oss-20b`

| Measure                                   | Result            |
| ----------------------------------------- | ----------------- |
| Single pass, all 8 cases                  | 7/8               |
| Out-of-scope refusal, 3 questions × 5     | 14/14 (1 errored) |
| `jitter`, 4 repeats                       | 1/4               |
| `jitter`, 4 repeats, audit `gpt-oss-120b` | 1/4               |

`jitter` fails on the confidence floor (0.55 < 0.65), and the auditor is right to hold it
there. The synthesis adds a consequence the source never states — "preventing synchronized
retries that could overload the system" — while the commit only says the jitter "stops
recovering clients from retrying in lockstep after an outage". The judge marks the claim as
weak support, which caps confidence at 0.55. The larger auditor gives the same verdict, so the
fix belongs in the synthesis prompt, not in the judge or in this gold case.

## Why it exists

Two payoffs. First, it's a regression guard for the behaviour that _is_ the product. Second,
it settles design questions empirically: the out-of-scope check is done inside the single
synthesis call rather than a separate classifier, and that call refused every scored
out-of-scope run (15/15 in July, 14/14 in September), so the extra round-trip isn't
warranted.
