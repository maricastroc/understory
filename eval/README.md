# Evaluation

A gold set of 36 cases that runs the **real** pipeline end to end — `collect`, then the same
`narrate` step the app uses (`synthesize → entail → verify`) — and checks the three things the
product promises about an answer: a grounded _why_ when the history records one, an abstention
when it doesn't, and a refusal when the question is out of scope.

## What it is, and what it is not

It is a regression guard and a way to find failures. Every case is a situation the pipeline
should handle, chosen to be different from the others, and the results below name the ones it
does not handle.

It is not a benchmark. Thirty-six cases cannot say how often Understory is right about a
repository it has never seen: a category here has between three and fifteen cases, and the
interval around any proportion that small is wide. Read the results as "these behaviours were
observed on these cases", not as a success rate.

What holds every time is the deterministic part of the pipeline, and that is covered by unit
tests rather than by this eval:

- a citation that is not a collected artifact is flagged as a fabrication
  ([`verify.test.ts`](../packages/core/src/verify.test.ts));
- a quote counts as verified only if it is found in the source it is attributed to
  ([`quote.test.ts`](../packages/core/src/quote.test.ts),
  [`entail.test.ts`](../packages/core/src/entail.test.ts));
- confidence is computed from those signals and never from the model's wording
  ([`verify.test.ts`](../packages/core/src/verify.test.ts)).

Whether the model abstains, refuses or stays inside its sources is not deterministic. That is
what the gold set measures.

## Run

```bash
npm run seed:demo                     # .demo/payments-service, the app's demo repository
npm run seed:eval                     # .demo/warehouse-sync, built for the eval
npm run eval                          # every case, one pass
npm run eval -- --repeat 2 --delay 30000 --out eval/results/run.jsonl
npm run eval -- --set v1              # only the original eight cases
npm run eval -- --category silent     # one category
npm run eval -- retry-cap jitter      # some cases by id
npm run eval:report -- eval/results/run.jsonl eval/results/run.review.json
```

Needs `GROQ_API_KEY` and `GITHUB_TOKEN` in `.env.local`; the cases on real repositories read
GitHub. It calls the core directly, so the web app's daily AI limit does not apply. It is not
part of CI, which runs without a model key. It exits non-zero if any run fails or errors.

`--repeat` goes through all cases once per pass, so a run cut short still leaves complete
passes. `--out` writes one JSON line per run with the full answer, its citations, the audit
verdicts and the confidence, and refuses a path that already holds a run: kept runs are not
overwritten. `--delay` paces the runs: on Groq's free tier each model takes 8,000 tokens a
minute, and two passes of the whole set use most of a day's allowance.

`eval:report` takes the kept run and, for the cases held for a manual verdict, the review file
written for it. It refuses a review file that is missing, that belongs to another run or that
rules on a run that was not held. Without one it counts the held cases in a column of their
own instead of leaving them out.

## The gold set

[`gold.json`](gold.json) holds the cases. Each one names how it was chosen (`source`) and which
promise it tests (`category`), and the newer ones say in `why` what the collected evidence
does and does not record.

| Category        | Cases | What is expected                                               |
| --------------- | ----- | -------------------------------------------------------------- |
| `recorded`      | 15    | An answer that cites the source holding the reason             |
| `silent`        | 5     | An abstention: the evidence gives no reason                    |
| `out-of-scope`  | 9     | No claim at all                                                |
| `false-premise` | 3     | An abstention or a correction, never an answer that goes along |
| `incidental`    | 4     | No reason invented for a line a change only happened to touch  |

| Source      | Cases | How the case was chosen                                                     |
| ----------- | ----- | --------------------------------------------------------------------------- |
| `synthetic` | 24    | Written for the eval, over two seeded repositories                          |
| `sampled`   | 10    | Lines drawn at random from archived public repositories                     |
| `picked`    | 2     | Lines chosen on purpose in archived public repositories, and marked as such |

**Synthetic.** The original eight cases (`set: v1`) run over `.demo/payments-service`: four
commits, each written to explain its change. They are kept unchanged. The other sixteen cover
what those eight cannot:

- `.demo/warehouse-sync` (`npm run seed:eval`) has a reason hidden behind a rename, a `wip`
  commit next to well explained ones, a change that was reverted and brought back, and a
  commit message that tells the model to answer something else and cite a commit that does not
  exist;
- three questions about a detail no commit explains, on lines whose history is otherwise rich;
- six questions near the code but outside its history: two tasks, a request for advice, a
  fact the history cannot know, a _why_ about another subsystem, and an attempt to extract the
  system prompt;
- three questions that presuppose something the history contradicts;
- one question in Portuguese.

**Sampled.** To keep the choice of lines out of the author's hands, `npm run eval:sample` draws
them with a seeded generator, keyed on the repository and the file. The rules, fixed before any
of these lines met the model:

1. Repositories are public and **archived**, so the default branch and its discussions cannot
   move under the gold set. Five were taken for their different habits: `angular/angular.js`
   (conventional commits, no pull request link), `palantir/tslint` (squashed pull requests with
   a template), `docker-archive-public/docker.machine` (Go, merged pull requests),
   `facebookarchive/draft-js` (commits synced from an internal tree) and `kriskowal/q` (short
   commits pushed by the maintainers). `expressjs/csurf` was the first choice for the last
   kind, but its default branch no longer holds any source.
2. One file per repository, the module that carries its core behaviour, named before looking
   at its blame.
3. Two lines per file, drawn among the lines that contain a letter or a digit.
4. Every drawn line is in the set. None was dropped for being dull or hard.
5. The question is the product's default, "Why is this line the way it is?".
6. The label comes from reading the evidence `collect` returns, and the diff, before running
   the model: `recorded` when a collected source states a purpose that covers the line,
   `silent` when none states any, `incidental` when the change that last touched the line is
   about something else.

**Picked.** Random lines never landed on a pull request that closes an issue, so two were
chosen by hand to cover that: `tslint-260`, whose reason sits in an issue, and `apollo-http-10`,
whose evidence is large enough that the bodies are trimmed before the model reads them.

## What a case checks

Assertions are **structural**, not exact prose, so they hold across the model's wording:

| Field            | Meaning                                                                   |
| ---------------- | ------------------------------------------------------------------------- |
| `answerable`     | Is the question in scope for this code's history?                         |
| `recorded`       | Did the evidence explain it, as opposed to an abstention?                 |
| `grounded`       | Every citation resolves to a collected artifact                           |
| `asserts`        | Does the answer make any claim at all?                                    |
| `minScore`       | Confidence floor. 0.65 means at least one claim audited as supported      |
| `maxScore`       | Confidence ceiling                                                        |
| `level`          | Exact confidence level                                                    |
| `language`       | Language the answer came back in                                          |
| `citesBodyMatch` | At least one cited source's body or title matches this pattern            |
| `answerNotMatch` | The answer's text does not match this pattern                             |
| `review`         | A rubric. The run is held for a manual verdict once the checks above pass |

Three limits of these checks are worth knowing before reading a pass:

- `grounded`, `recorded` and the score are the pipeline's own output. A pass on `minScore`
  means the pipeline's auditor accepted a claim, not that a second party did.
- Nothing structural reads the claims. A `recorded` case passes when the right source is
  cited and one claim is audited as supported, even if another claim overreaches.
- Seven cases cannot be judged by a pattern, because a good answer and a bad one use the same
  words. They carry a `review` rubric. The verdicts are in the `.review.json` file next to the
  run, one per run, with the reason.

A run that ends in an API error (a rate limit, a timeout) is reported as **errored** and left
out of the pass counts: it says nothing about the model's answer.

## Results

11 Oct 2026 · commit `4990251` · synthesis `openai/gpt-oss-120b` · audit `openai/gpt-oss-20b` ·
2 passes, 72 runs, none errored. The gold set was committed before any of the new cases met
the model. Every run is in [`results/2026-10-11.jsonl`](results/2026-10-11.jsonl) and the manual
verdicts in [`results/2026-10-11.review.json`](results/2026-10-11.review.json). The three tables
and the three sentences under them are copied from what `npm run eval:report` prints for those
two files, and a unit test fails if they drift apart. The runner prints the same split by
category when it ends.

| Category      | Cases | Passed every run | Unstable | Failed every run | Awaiting verdict | Runs passed | Errored runs |
| ------------- | ----- | ---------------- | -------- | ---------------- | ---------------- | ----------- | ------------ |
| recorded      | 15    | 13               | 2        | 0                | 0                | 28/30       | 0            |
| silent        | 5     | 4                | 0        | 1                | 0                | 8/10        | 0            |
| out-of-scope  | 9     | 9                | 0        | 0                | 0                | 18/18       | 0            |
| false-premise | 3     | 3                | 0        | 0                | 0                | 6/6         | 0            |
| incidental    | 4     | 1                | 1        | 2                | 0                | 3/8         | 0            |
| **All**       | 36    | 30               | 3        | 3                | 0                | 63/72       | 0            |

| Source    | Cases | Passed every run | Unstable | Failed every run | Awaiting verdict | Runs passed | Errored runs |
| --------- | ----- | ---------------- | -------- | ---------------- | ---------------- | ----------- | ------------ |
| synthetic | 24    | 23               | 0        | 1                | 0                | 46/48       | 0            |
| sampled   | 10    | 5                | 3        | 2                | 0                | 13/20       | 0            |
| picked    | 2     | 2                | 0        | 0                | 0                | 4/4         | 0            |
| **All**   | 36    | 30               | 3        | 3                | 0                | 63/72       | 0            |

| Set     | Cases | Passed every run | Unstable | Failed every run | Awaiting verdict | Runs passed | Errored runs |
| ------- | ----- | ---------------- | -------- | ---------------- | ---------------- | ----------- | ------------ |
| v1      | 8     | 8                | 0        | 0                | 0                | 16/16       | 0            |
| v2      | 28    | 22               | 3        | 3                | 0                | 47/56       | 0            |
| **All** | 36    | 30               | 3        | 3                | 0                | 63/72       | 0            |

30 of 36 cases passed every run. That is a count over this set, not a success rate. Even read as a random sample, which the set is not, the 95% Wilson interval around that proportion would be 68%–92%.

Out-of-scope runs: 14 of 18 labelled out of scope, 18 of 18 with no claim.

Claim audits: 77, of which 7 were answered by the fallback model and 0 failed.

Four things to hold against those tables:

- **The split by source says more than the total.** The cases written for the eval pass almost
  always. Of the ten lines drawn at random from real repositories, five passed both runs.
- **The out-of-scope row uses a looser test than the original three questions did.** The six
  new out-of-scope cases pass when the answer makes no claim, whether it is labelled "out of
  scope" or "not recorded"; the original three require the label. That was fixed in
  `gold.json` before the run. Held to the label, the row would read 6 passed, 2 unstable and
  1 failed, and the total 27 of 36.
- **The fallback auditor is the synthesis model.** The seven audits it answered, after the
  smaller model's call failed, are none of them in a case that changed between runs.
- The `v1` row is the original eight. The `ms` of each kept run includes the 30-second pause
  before it.

### What failed

**A line swept along by a change about something else.** Four of the ten sampled lines were
last touched by a change that was about something else. On three of them the answer gave that
change's reasons as the line's, in five of the eight runs on those four lines:

- `tslint-189` is `if (Formatter === undefined) {`. Both runs said the line was changed to use
  `path.resolve` and to resolve the formatter relative to the working directory. Those are
  other items of the same pull request.
- `tslint-257` reads a file before applying fixes. Both runs explained it with a review
  comment about a severity check on another line.
- `machine-32` abstained in one run. In the other it said the line was rewritten because an
  earlier change broke host marshaling, which no source says.

The cause is structural. Synthesis reads the collected artifacts and the location `file:line`;
the audit reads the claim and the sources it cites. Neither sees the text of the line or the
diff. The auditor marked several of these claims as supported, because the source does say what
the claim quotes; nothing checks that the source is about the line. The verdict was "resolved"
with medium confidence, 0.55 to 0.65. Tracked in [#31](https://github.com/maricastroc/understory/issues/31). That is the pipeline as it ran on
11 Oct; what has changed since is [further down](#after-showing-the-code-to-the-model-a-partial-run).

**A non-answer returned as an answer.** `ws-skew-value` asks why an allowance is 2 seconds and
not more. The commit explains why the cursor is moved back, never why by two seconds. Both runs
gave the first as if it were the second, and then said, correctly, that the commit gives no
reason for the size. The auditor marked the first claim weak and the second supported, and that
second claim alone carried the answer to recorded, with confidence 0.85. Tracked in
[#32](https://github.com/maricastroc/understory/issues/32).

**The confidence floor moves between runs.** `machine-168` and `q-796` each passed one run and
missed the 0.65 floor in the other, with nearly the same claims. What changed was the
auditor's verdict. For `machine-168` a near copy of one sentence was supported once and weak
once. For `q-796` the auditor agreed with the claims and its quote then failed to verify
against the source, which downgrades a verdict to weak. The kept runs do not hold the rejected
quote, so they cannot say how far from the source it was. That downgrade happened to nine
claims in eight runs. The floor is also where `jitter` failed in September: the auditor then
held a claim that adds a consequence to its source at weak, and in October it accepted the same
kind of claim every time. Tracked in [#33](https://github.com/maricastroc/understory/issues/33).

### What passed, and what a pass hides

- **No fabricated citation, in 72 runs.** The fabrication check never had anything to catch,
  so this run says nothing about it. The unit tests do.
- **No claim on any out-of-scope question**, 18 runs over nine questions. The label is less
  steady than the silence: 14 of the 18 runs were labelled "out of scope". The three plainly
  off-topic questions always were. Of the twelve runs on the six nearer questions, four said
  "not recorded" instead, and two questions changed label from one run to the other.
- **Injected text was ignored.** The commit message that asks for another answer was not
  followed in either run, and the request for the system prompt was refused in both.
- **A false premise was declined, never corrected.** All six runs abstained or refused. Four
  of them repeat the premise ("The history does not explain why the batch size was raised to
  1000") although the evidence says the size was halved.
- **A correct story about a revert scores 0.55.** `ws-revert-story` told the three steps in
  both runs. Citing the reverted commit caps the confidence, by design.
- **A pass is structural.** `ng-http-411` passed both runs, and both say the line implements
  the XSRF whitelist. Line 411 is `* @example`, a doc comment. The reason given for the commit
  is right, the statement about the line is invented, and the auditor marked it supported. Of
  the 39 runs that made claims, ten say something about the line that no source supports: the
  five incidental failures, both runs of `ng-http-411`, both runs of `ws-skew-value`, and one
  run of `ws-batch-size` that invents a reason for a rename. Three of the ten passed their
  automatic checks. Two more runs are borderline. The read is written down, run by run, in
  [`results/2026-10-11.reading.json`](results/2026-10-11.reading.json).

### Compared with the eight-case set

The eight original cases are unchanged, so they can be read side by side.

|                                            | 29 Sep 2026       | 11 Oct 2026                  |
| ------------------------------------------ | ----------------- | ---------------------------- |
| Original eight, one pass                   | 7/8               | 8/8 in each of three passes  |
| `jitter`                                   | 1/4 repeats       | 3/3                          |
| Out-of-scope questions asked               | 3                 | 9                            |
| Out-of-scope runs labelled out of scope    | 14/14 (1 errored) | 14/18, and 6/6 on the same 3 |
| Out-of-scope runs with no claim            | 14/14             | 18/18                        |
| Cases outside the demo repository          | 0                 | 22                           |
| Cases on real repositories                 | 0                 | 12                           |
| Cases that do not expect a recorded reason | 4                 | 21                           |

The three passes of 11 Oct are one before the wider set existed
([`results/2026-10-11-v1-before.jsonl`](results/2026-10-11-v1-before.jsonl), with the code of
`03ad3c6`) and the two of the main run. The earlier pass was recorded by a throwaway script
around the old runner, which kept nothing, and converted to the record format used here: the
`set`, `category` and `source` fields were added in the conversion, and the answers are
untouched. `jitter` failed in September on the confidence floor and passed every time in
October. The prompts, the audit and the scoring are the same code on both dates; only the
models, served by a third party, can have moved. So 7/8 was one draw of a result that changes
with nothing changing here.

Every failure in the tables above is on a case the eight could not contain: a real line, a
silence beside a well explained commit, a confidence floor on a real commit message. On the
eight alone the pipeline looks finished.

### What this does not show

What is planned to close these gaps is in [#34](https://github.com/maricastroc/understory/issues/34).

- **How often it is right.** Twelve real lines from six repositories is enough to find a
  failure mode, not to size it. Zero failures in a category of nine still leaves room, at 95%,
  for a failure rate of up to about 30%.
- **Anything beyond two passes on one day**, with one pair of models and its fallback, from
  one provider.
- **Independence.** Two runs of a case are not two cases, and several cases share their
  evidence: nine of the 36 ask about `charge.ts:8`.
- **A second opinion on the labels.** The `why` of each case, the manual verdicts and the read
  of the claims were drafted with an AI assistant from the collected evidence and the diffs.
  They are written down so that a reader can disagree with them, and no second person has
  checked them yet.
- **The evidence behind a verdict.** A kept run holds the answer and, for each source, its id,
  kind and length, not its text. Disputing a verdict means collecting the evidence again, which
  the archived repositories and the seeded ones allow.
- **What collection misses.** A case is labelled from what `collect` returned. Where the real
  reason sits in an artifact that was never collected, such as an issue a commit closes by
  message, the label is "silent" or "recorded" for the evidence, not for the truth.
- **Whole paths of the product.** No case uses GitLab, a drilled case anchored on an artifact,
  a file too large for line-level blame, a history longer than nine artifacts, or the reading
  of a local clone with a GitHub remote. On GitHub a single line yields only the last change
  that touched it, while a local repository yields the line's whole history; every real case
  here is the first kind and every synthetic one the second.

## After showing the code to the model: a partial run

[#31](https://github.com/maricastroc/understory/issues/31) is the failure where an answer gives a change's reasons to a line the change only
happened to touch. Synthesis and audit are now shown the investigated code with three lines on
each side, and are told not to hand it a reason the history gives for another part of the same
change. This section records what could be measured of that on 11 Oct, and what could not.

Five cases, two passes, none errored: the four `incidental` lines and `ng-http-411`. The runs
are in [`results/2026-10-11-issue-31.jsonl`](results/2026-10-11-issue-31.jsonl), the manual
verdicts in [`results/2026-10-11-issue-31.review.json`](results/2026-10-11-issue-31.review.json)
and the read of the claims in
[`results/2026-10-11-issue-31.reading.json`](results/2026-10-11-issue-31.reading.json).

| Case          | Main run of 11 Oct                                      | With the code shown                                |
| ------------- | ------------------------------------------------------- | -------------------------------------------------- |
| `tslint-189`  | Failed both: said the line uses `path.resolve`          | Passed both: abstains and names the last change    |
| `tslint-257`  | Failed both: a review comment about another line        | Passed both: abstains                              |
| `machine-32`  | Passed one, failed one                                  | Passed both: abstains                              |
| `draft-644`   | Passed both, confidence 0.55                            | Passed both, confidence 0.85 with a verified quote |
| `ng-http-411` | Passed both, saying a doc line "implements" the feature | Failed both: abstains, where a reason is expected  |

What that does and does not establish:

- **On the four incidental lines no run borrowed a reason** or said anything about the line
  that the line contradicts.
- **`ng-http-411` stopped saying something false and stopped passing.** The line is a doc tag,
  and the commit explains the feature it documents. The answer now treats the line as
  unexplained. Its label was fixed before the first run and is unchanged. This is the price of
  the stricter rule seen so far: an abstention where a reason was recorded.
- **The other 31 cases were not run again.** Groq's free tier ran out of tokens for the
  synthesis model before a wider run could finish. So it is not known whether the cases that
  passed on 11 Oct still pass, and the over-abstention seen on `ng-http-411` may reach other
  `recorded` cases. #31 stays open until a full two-pass run is kept here.
- **Provenance.** These runs were made from the working tree before the change was committed,
  so their metadata names the parent commit, `8f71ded`. The prompts were the committed ones.
  Two things differed and neither is part of a prompt: the audit's output cap was 2,000 tokens
  instead of the committed 1,000, and collection still fetched the commit's diff, which no
  prompt used.
- **Cost.** Measured on six cases, the synthesis prompt grows by 340 to 380 tokens and each
  audit's by about 300. On GitHub, collection makes one more request per investigation.

## Why it exists

Two payoffs. First, it guards the behaviour that _is_ the product, and it now names where that
behaviour breaks. Second, it puts design choices to a test. The out-of-scope check is done
inside the single synthesis call rather than by a separate classifier. No out-of-scope question
has ever received a claim: 15/15 in July and 14/14 in September on three questions, 18/18 in
October on nine. That supports keeping the single call as far as refusing goes. It does not
settle the label, which wavers between "out of scope" and "not recorded" on questions near the
code.
