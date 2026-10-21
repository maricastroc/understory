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
npm run eval -- --repeat 2 --via openrouter --out eval/results/run.jsonl
npm run eval:report -- eval/results/run.jsonl eval/results/run.review.json
npm run eval:audit -- eval/results/run.jsonl --repeat 4 --via openrouter --out eval/results/replay.jsonl
npm run eval:audit -- eval/results/run.jsonl eval/audit-controls.json --repeat 4 --via openrouter --out eval/results/replay.jsonl
npm run eval:walk -- eval/results/walk.json 3
npm run eval:pertinence -- eval/results/pertinence.json
```

Needs `GROQ_API_KEY` and `GITHUB_TOKEN` in `.env.local` or `.env`; the cases on real repositories read
GitHub. It calls the core directly, so the web app's daily AI limit does not apply. It is not
part of CI, which runs without a model key. It exits non-zero if any run fails or errors.

`--repeat` goes through all cases once per pass, so a run cut short still leaves complete
passes. `--out` writes one JSON line per run with the full answer, its citations, the audit
verdicts and the confidence, and refuses a path that already holds a run: kept runs are not
overwritten. `--delay` paces the runs: on Groq's free tier each model takes 8,000 tokens a
minute, and two passes of the whole set use most of a day's allowance.

`--via openrouter` is for when the free tier's daily allowance is spent. It sends each model
call through OpenRouter, pinned to Groq with no fallback, so the run reaches the same two models
on the same host and is billed to `OPEN_ROUTER_API_KEY` instead. That key is read from `.env` or
`.env.local` and used by this script only. A reply that came through another host is refused.
The run's metadata names the route, and the runner prints and keeps the tokens and the cost per
model.

`eval:audit` measures the audit alone. Two runs of a case rarely write the same claims, so a
run of the whole pipeline cannot say whether the audit gives one claim one verdict. It takes
the claims that kept runs audited, collects the evidence again and asks the audit about each
claim `--repeat` times, plus once against the sources of a case from another repository as a
control. It keeps the judge's raw answer next to the final verdict. Given a kept replay
instead of a run, it prints that replay's summary and calls no model.

Given a `.json` file of written controls as well, it replays those too.
[`audit-controls.json`](audit-controls.json) holds 53 claims about cases of the gold set, each
with the verdict it should get. The expectations were fixed before any of the claims met the
audit, and are not edited after a run. The summary counts them by kind, apart from the kept
claims, and names the ones that missed.

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

**Amended once after it met the model.** On 12 Oct 2026 `ng-http-411` was given a `review`
rubric. Its label was checked against rule 6 and stays `recorded`: the line is `* @example`, in
a doc comment that commit `1e90d03` added for the feature the commit message explains. What was
wrong was the test. With automatic checks alone the case passed in 21 kept runs, and in every
one of them the answer says the line implements, checks or sends something. A doc comment does
none of that. [#31](https://github.com/maricastroc/understory/issues/31) had already recorded
that answer as false, and the read of 11 Oct had listed both of its runs as unsupported while
noting that they passed. The rubric only adds a condition: a run still has to pass every
automatic check first. So it can turn a pass into a fail and never the reverse.

The kept runs and their review files are not rewritten. Every stored run of the case is read
against the rubric in
[`results/2026-10-12-ng-http-411.reread.json`](results/2026-10-12-ng-http-411.reread.json), and
this is what it does to the counts of each kept run:

| Kept run                                                | Recorded, as scored then | Recorded, with the rubric | `ng-http-411` |
| ------------------------------------------------------- | ------------------------ | ------------------------- | ------------- |
| `2026-10-11.jsonl`                                      | 28/30                    | 26/30                     | 2/2 to 0/2    |
| `2026-10-11-via-openrouter.jsonl`                       | 29/30                    | 27/30                     | 2/2 to 0/2    |
| `2026-10-11-recorded-before-evening.jsonl`              | 52/60                    | 48/60                     | 4/4 to 0/4    |
| `2026-10-11-audit-first-fix.jsonl`                      | 54/60                    | 50/60                     | 4/4 to 0/4    |
| `2026-10-11-audit-fix.jsonl`                            | 54/60                    | 50/60                     | 4/4 to 0/4    |
| `2026-10-12-line-attribution-before-on-main.jsonl`      | 50/60                    | 49/60                     | 1/4 to 0/4    |
| `2026-10-12-line-attribution-before-on-audit-fix.jsonl` | 56/59                    | 52/59                     | 4/4 to 0/4    |
| `2026-10-12-line-attribution.jsonl`                     | 52/59                    | 52/59                     | 0/4 to 0/4    |

Every table further down keeps the outcome a run was given when it was made. Where the
rubric changes a reading, the text says so.

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
- Eight cases cannot be judged by a pattern, because a good answer and a bad one use the same
  words. They carry a `review` rubric. The verdicts are in the `.review.json` file next to the
  run, one per run, with the reason. Seven had the rubric before they met the model. The
  eighth, `ng-http-411`, got it on 12 Oct ([The gold set](#the-gold-set)).

A run that ends in an API error (a rate limit, a timeout) is reported as **errored** and left
out of the pass counts: it says nothing about the model's answer.

### What counts as evidence, and for what

An answer about a line says two kinds of things, and they are not checked against the same
record.

- **What the line is, and what a change did to it.** "This is a doc comment", "the commit added
  this line", "it used to read `var`". The record for these is the code at the investigated
  revision and the patch of the commit that last touched the line. Collection reads both without
  a model. Such a statement is true or false by looking, and no commit message has to repeat it.
- **Why.** A motive, a problem, a decision, a consequence: "because the vendor rejects larger
  pages", "to follow jQuery". The record for these is a collected source: a commit message, a
  pull request, an issue, a review. The code never proves a reason. A reason read off the code is
  a guess, however plausible.

A sentence that mixes the two is read part by part, and is wrong if either part is.

So a manual verdict, or a read of the claims, fails an answer for three things: a statement
about the line that the code or the patch contradicts, a reason that no source gives, and a
reason a source gives for another part of the change. It does not fail an answer for saying
something true about the code that no source repeats. The reads kept since 12 Oct list that
last kind apart, under `fromTheCode`, so that it can be counted and checked.

Two parts of the system do not work to this rule, and a result has to be read knowing it:

- The automatic checks see the answer's structure and the audit's verdict, never the claims.
- The audit applies the rule only in part. Since the line and its last change are shown to it,
  it is told they are established, and it still asks a source for some of what they show. On
  `ng-http-411` it held "this line was added as part of a JSDoc comment documenting the new
  XSRF-token-whitelisting feature" at weak, in both runs that said it, because no commit message
  says a line is documentation. Tracked in
  [#43](https://github.com/maricastroc/understory/issues/43).

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

Claim audits: 77, of which 7 were answered by the fallback model and 0 failed. The judge called 59 claims supported, and 9 of those were set back to weak because the passage it quoted is not in the source.

Five things to hold against those tables:

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
- **One of these passes was withdrawn afterwards.** `ng-http-411` passed both runs on the
  automatic checks while saying that a doc comment implements a feature. It has had a rubric
  since 12 Oct ([The gold set](#the-gold-set)), under which both runs fail. Read that way the
  recorded row is 26/30, and 29 of the 36 cases passed every run.

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
with medium confidence, 0.55 to 0.65. Tracked in [#31](https://github.com/maricastroc/understory/issues/31).
What was changed for it, and what that cost, is under
[Line attribution after #31](#line-attribution-after-31).

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
What was changed for it, and what it did and did not settle, is under
[The audit after #33](#the-audit-after-33).

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

### The same set through OpenRouter

When the free tier is spent, a run can go through OpenRouter pinned to Groq (see [Run](#run)).
To check that this route measures the same thing, the whole set was run twice through it on the
same day, on the same pipeline:
[`results/2026-10-11-via-openrouter.jsonl`](results/2026-10-11-via-openrouter.jsonl), with its
manual verdicts in
[`results/2026-10-11-via-openrouter.review.json`](results/2026-10-11-via-openrouter.review.json).

|                             | Straight to Groq | Through OpenRouter |
| --------------------------- | ---------------- | ------------------ |
| Cases that passed every run | 30               | 31                 |
| Unstable                    | 3                | 1                  |
| Failed every run            | 3                | 4                  |
| Runs passed                 | 63/72            | 63/72              |
| Out-of-scope runs labelled  | 14/18            | 13/18              |
| Claim audits                | 77, 7 fell back  | 83, 12 fell back   |

Thirty-four of the 36 cases ended in the same place, and 30 of the 72 routed answers are word
for word an answer of the direct run. The two that moved, `machine-168` and `machine-32`, were
already unstable in the direct run. Every reply was served by Groq: the runner refuses any
other. So the route is taken as equivalent, within what two runs of the same thing already
differ by. The read of the claims was not repeated for this run.

It is also the first run whose use was measured: 84 calls and 148,000 tokens on the synthesis
model (72 answers and 12 audits that fell back to it), 83 calls and 115,000 tokens on the audit
model, US$ 0.047 in all.

### The audit after #33

The tables above describe the pipeline of 11 Oct. This section describes the audit as it is
now. Everything in it was run on the evening of 11 Oct, local time, through OpenRouter pinned
to Groq. The kept files are dated 12 Oct inside, in UTC.

**What changed in the audit.**

- The judge is told what the repository's history already settles. The sources it reads are
  the changes that touched the investigated code, and each one is headed with what it is to
  that code: a commit that changed it, the pull request that merged that commit, an issue
  linked to the pull request, a review comment on it. A claim that says "the line was added in
  this pull request" is no longer held to a proof no commit message gives. Everything else a
  claim asserts still needs proof.
- The quote check ignores four differences between the judge's copy and the source: letter
  case, spacing, the kind of dash, and quotation or code marks. Nothing else. A changed word, a
  corrected typo or a passage shortened with "..." is still refused.
- The judge returns its proof as separate passages. A passage that strings whole sentences or
  lines of one source together is checked sentence by sentence. A supported verdict stands on
  the passages that are in the source, and needs at least one. What is kept and shown is the
  source's own text. What is refused is kept in the result as `rejectedQuotes`.
- The judge answers `supported`, `unproven` or `unrelated`, stored as supported, weak and
  unsupported. Under the name "unsupported" it filed claims the source left unproven as
  misattributions.
- Its output budget went from 1,000 to 2,000 tokens. At 1,000 the model spent the whole budget
  reasoning about hard claims and returned nothing, which sent the claim to the fallback model.

**The audit alone.** The 145 claims audited in the two runs of 11 Oct, each judged four times
on the same evidence, before the change
([`results/2026-10-11-audit-replay-before.jsonl`](results/2026-10-11-audit-replay-before.jsonl),
commit `cc3574a`) and after
([`results/2026-10-11-audit-replay-after.jsonl`](results/2026-10-11-audit-replay-after.jsonl),
commit `c29525d`). These are the lines `npm run eval:audit` prints for each file, and a unit
test fails if they drift apart.

Before:

```text
Claims given the same verdict on every replay: 126 of 145 (87%).
  recorded, synthetic: 50 of 52 (96%)
  silent, synthetic: 7 of 7 (100%)
  recorded, sampled: 26 of 26 (100%)
  incidental, sampled: 25 of 33 (76%)
  recorded, picked: 18 of 27 (67%)
Verdicts: 376 supported, 173 weak, 26 unsupported over 575 judgements; 5 errored.
Supported verdicts lost to a quote the source does not contain: 53 of 429 (12%).
Judgements answered by the fallback model: 70 of 575 (12%).
Control, each claim against another repository's sources: 0 of 145 (0%) came back supported.
```

After:

```text
Claims given the same verdict on every replay: 132 of 145 (91%).
  recorded, synthetic: 49 of 52 (94%)
  silent, synthetic: 7 of 7 (100%)
  recorded, sampled: 24 of 26 (92%)
  incidental, sampled: 30 of 33 (91%)
  recorded, picked: 22 of 27 (81%)
Verdicts: 434 supported, 144 weak, 1 unsupported over 579 judgements; 1 errored.
Supported verdicts lost to a quote the source does not contain: 6 of 440 (1%).
Judgements answered by the fallback model: 10 of 579 (2%).
Control, each claim against another repository's sources: 1 of 145 (1%) came back supported.
```

Read with these:

- **The two mechanical causes are gone. The rest of the instability is not.** Of the claims
  that changed verdict between replays, six did so before only because a quote was refused in
  some replays and accepted in others, and one does now. Thirteen before and twelve now changed
  because the judge itself answered differently. Those twelve are claims that add an inference
  to their source ("which implies", "so that"), and on them one judgement is a weighted coin.
  Six more claims are steady out of 145, which is within what two replays of the same audit
  differ by.
- **Of the 53 quotes refused before, 45 were the source's own words** in other quotation marks,
  another dash, without code marks or with repaired spacing. Five joined two real passages and
  three were not in the source. Of the six refused now, four are one claim on `tslint-257` whose
  passages correct a typo of the source and change its list markers, and two are a stack trace
  the judge copied up to the point where the request cuts a long source, cut mark included.
- **The control that came back supported** is a claim that says the commit gives no reason for
  something. That is true of any unrelated commit, so the control cannot tell it apart.
- **What moved, by where the claim comes from.** Judgements that ended supported went from 124
  to 157 of 211 on recorded real lines, from 182 to 174 of 208 on recorded synthetic lines,
  and from 50 of 128 to 83 of 132 on the lines of the incidental cases. The claims the old
  audit always supported and the new one does not are claims that add a motive, a detail or a
  benefit the source does not state, and one that says the opposite of its source, which the
  old audit supported four times in four and the new one once.
- **It costs more.** A judgement now reads about 1,230 tokens and writes about 630, against
  840 and 480: the request is longer and hard claims are reasoned to the end. Over both audit
  models the replay used 1.37 million tokens where it had used 1.06 million, US$ 0.184
  against US$ 0.138.

A first version of the change, without the sentence-by-sentence check and the headings, was
measured the same way and is kept:
[`results/2026-10-11-audit-replay-first-fix.jsonl`](results/2026-10-11-audit-replay-first-fix.jsonl),
[`results/2026-10-11-audit-first-fix.jsonl`](results/2026-10-11-audit-first-fix.jsonl) and
[`results/2026-10-11-two-cases-first-fix.jsonl`](results/2026-10-11-two-cases-first-fix.jsonl).
Its rejected quotes are what showed the two things the final version adds.

**The whole pipeline.** Four passes of the 36 cases on the changed audit:
[`results/2026-10-11-audit-fix.jsonl`](results/2026-10-11-audit-fix.jsonl), with the manual
verdicts in [`results/2026-10-11-audit-fix.review.json`](results/2026-10-11-audit-fix.review.json).
"Before" is the two runs of 11 Oct read as four passes.

|                                             | Before, 11 Oct | After    |
| ------------------------------------------- | -------------- | -------- |
| recorded, runs passed                       | 57/60          | 54/60    |
| silent, runs passed                         | 16/20          | 16/20    |
| out-of-scope, runs passed                   | 36/36          | 36/36    |
| false-premise, runs passed                  | 12/12          | 12/12    |
| incidental, runs passed                     | 5/16           | 7/16     |
| Supported verdicts set back by their quote  | 13 of 119      | 1 of 109 |
| Claim audits answered by the fallback model | 19 of 160      | 6 of 151 |

The two incidental runs gained are runs in which the writer abstained on `machine-32`. The
answers on `tslint-189` and `tslint-257` fail as before.

The recorded row went down, and the audit is not why. Three of the six failed runs are runs in
which the writer abstained on `machine-168` and `q-306`: "The history does not explain why this
line is the way it is", on evidence it had explained in every earlier run of the day, 38 runs
on real recorded lines with no abstention. The writer was not changed. To tell the two apart,
the 15 recorded cases were run four times on the unchanged audit the same evening
([`results/2026-10-11-recorded-before-evening.jsonl`](results/2026-10-11-recorded-before-evening.jsonl),
commit `cc3574a`):

| Recorded cases, four passes the same evening | Unchanged audit | Changed audit |
| -------------------------------------------- | --------------- | ------------- |
| Runs passed                                  | 52/60           | 54/60         |
| on synthetic lines                           | 30/32           | 31/32         |
| on real lines                                | 22/28           | 23/28         |
| Failed: the writer abstained                 | 2               | 3             |
| Failed: a supported verdict lost its quote   | 2               | 0             |
| Failed: no claim was judged supported        | 3               | 3             |
| Failed: answered in the wrong language       | 1               | 0             |
| Supported verdicts set back by their quote   | 8 of 88         | 0 of 83       |
| Claim audits answered by the fallback model  | 14 of 109       | 5 of 109      |
| Claim audits that failed                     | 2               | 0             |

So the change did not cost recorded cases, and it did not win any that these counts can show.
The three runs that failed with no supported claim are single-claim answers to `jitter`,
`q-306` and `q-796` whose one claim adds something to its source, such as "reducing the risk of
synchronized spikes in traffic". The writer abstaining on a line it explained an hour before is
a separate failure. From 21:20 on it happened in 17 of 117 runs on real recorded lines, 13 of
them on `machine-168`, and in 5 of the 38 of those runs that used the unchanged audit. It is
tracked in [#39](https://github.com/maricastroc/understory/issues/39).

**The two cases the issue names**, five repeats each, before and after. The first "before" run
was taken at 21:18 and the second at 21:49, either side of the "after" run.

| `machine-168` and `q-796`, 10 runs         | Before, 21:18 | After  | Before, 21:49 |
| ------------------------------------------ | ------------- | ------ | ------------- |
| Runs passed                                | 6             | 5      | 3             |
| Failed: the writer abstained               | 0             | 5      | 3             |
| Failed: a supported verdict lost its quote | 3             | 0      | 4             |
| Failed: no claim was judged supported      | 1             | 0      | 0             |
| Runs in which the writer answered, passed  | 6 of 10       | 5 of 5 | 3 of 7        |

Files: [`before`](results/2026-10-11-two-cases-before.jsonl),
[`after`](results/2026-10-11-two-cases-after.jsonl),
[`before again`](results/2026-10-11-two-cases-before-again.jsonl). Neither case stays on one
side of the 0.65 floor over five repeats, before or after, so that criterion of #33 is not met.
What changed is why: every failure the audit caused on these two cases is gone, and every
failure left is the writer abstaining.

**What the change made worse.** The old audit marked down some claims about a line swept along
by a change because no source named the line. That was the wrong reason, applied to some
phrasings and not to others, and it was also the only brake on those claims. With it gone, the
audit confirms more of them. On `tslint-257`, where every answer gives the enable/disable
rewrite as the reason for a line that reads a file, the confidence was 0.55 to 0.65 in the four
runs of 11 Oct and is 0.9 in three of the four runs now. The answers were wrong before and are
wrong now; the audit agrees with them more. The audit cannot see this without the code, and
the fix belongs to [#31](https://github.com/maricastroc/understory/issues/31).

**What was tried and left out.** Asking the model for low reasoning effort removed every failed
call and cut the audit's output to a quarter, and it also made the judge accept motives no
source states, such as a rename "to reflect its role". A fixed seed changed nothing that four
replays can show. Asking the judge again when its quote was refused recovered 2 of 16. A second
judgement per claim, to keep the lower of two readings, was not built: it doubles the audit's
tokens, and on a claim the judge supports three times in four it would fail more runs, not
fewer.

Four cases were also run once straight to Groq, to check that the changed request works on the
route the product uses
([`results/2026-10-11-audit-fix-direct-check.jsonl`](results/2026-10-11-audit-fix-direct-check.jsonl)):
four of four passed, with no failed and no fallback audit.

### Line attribution after #31

The pipeline now reads the investigated line and what the last change did to it, and shows both
to the writer and to the audit. This section measures that. It ran in the night of 11 to 12
Oct, through OpenRouter pinned to Groq, with the machine asleep for most of it, so the three
runs below overlap over about four hours instead of twenty minutes. Five of their 320 runs
ended in an API error and are counted as errored.

**What changed.**

- Collection keeps the investigated line with three lines on each side, and reads from the
  owning commit's patch what that commit did to the line: added it, and with how many other
  lines, or rewrote it, and from what. On GitHub and on local repositories, for a single line.
  When the file or the patch cannot be read, or the line is not found exactly once in the patch,
  the evidence goes on without them.
- The writer is shown both before the evidence. It is asked first whether the code is part of
  what the evidence describes. If it is, the change's stated purpose is the recorded reason. If
  the evidence is about other parts of the change, the answer is an abstention that names the
  change and what it did to the line.
- The audit is given the same code and the same fact as established.

**Three versions, four passes each, the same night.** The unchanged pipeline of `main`
([`before-on-main`](results/2026-10-12-line-attribution-before-on-main.jsonl), commit
`cc3574a`), the audit change of #33 alone
([`before-on-audit-fix`](results/2026-10-12-line-attribution-before-on-audit-fix.jsonl), commit
`fd843e2`), and this change on top of it
([`results/2026-10-12-line-attribution.jsonl`](results/2026-10-12-line-attribution.jsonl),
commit `85a9aec`). Each has its manual verdicts beside it in a `.review.json`. The two
baselines ran only the three categories this change is about.

| Runs passed                                | `main`           | Audit change     | This change      |
| ------------------------------------------ | ---------------- | ---------------- | ---------------- |
| incidental                                 | 5/16             | 7/16             | 16/16            |
| false-premise                              | 11/11, 1 errored | 12/12            | 11/11, 1 errored |
| recorded, synthetic                        | 31/32            | 31/31, 1 errored | 32/32            |
| recorded, real lines                       | 19/28            | 25/28            | 20/27, 1 errored |
| the same, with the rubric of `ng-http-411` | 18/28            | 21/28            | 20/27, 1 errored |
| silent                                     | not run          | not run          | 19/19, 1 errored |
| out-of-scope                               | not run          | not run          | 36/36            |

The recorded real lines, one by one:

| Case                      | `main` | Audit change | This change    |
| ------------------------- | ------ | ------------ | -------------- |
| `ng-http-114`             | 4/4    | 4/4          | 4/4            |
| `ng-http-411`             | 1/4    | 4/4          | 0/4            |
| the same, with its rubric | 0/4    | 0/4          | 0/4            |
| `machine-168`             | 2/4    | 2/4          | 2/4            |
| `q-306`                   | 3/4    | 3/4          | 4/4            |
| `q-796`                   | 3/4    | 4/4          | 3/4            |
| `tslint-260`              | 2/4    | 4/4          | 4/4            |
| `apollo-http-10`          | 4/4    | 4/4          | 3/3, 1 errored |

Read with these:

- **The four swept-along lines no longer get another line's reasons.** Fifteen of the 16 runs
  abstain or explain the `var` to `const` sweep, and the one that answers on `tslint-189` says
  only that the condition was rewritten during the loader cleanup. The abstentions now say what
  happened: "The last change rewrote the line from `if (Formatter !== undefined)` to
  `if (Formatter === undefined)`, but the provided PR and commit messages do not explain why."
  On both baselines `tslint-189` and `tslint-257` fail every run, as on 11 Oct.
- **`ng-http-411` is the whole difference on recorded lines, and what it lost was a false
  pass.** Line 411 is `* @example`. On the audit change it passes four runs in four by saying
  the line "implements a check that only adds the XSRF token header", audited as supported with
  confidence 0.85 to 0.9. The case was given a rubric after this run
  ([The gold set](#the-gold-set)), and with it those four fail, as does the one pass on `main`.
  With the line in view no run says that. Two say the line was added as part of the
  documentation of the XSRF whitelist feature, which is true and is what the case expects, and
  the audit holds it at weak because no commit message says a line is documentation
  ([#43](https://github.com/maricastroc/understory/issues/43)). Two abstain: "the commit
  message and other evidence do not explain why this @example line was written that way". So
  the case fails in all three columns, for three different reasons: a false statement credited,
  a true one not credited, and an abstention on a line whose commit explains what it documents.
- **`machine-168` fails two runs in four in all three columns**, each time because the writer
  abstained. That is [#39](https://github.com/maricastroc/understory/issues/39), not this change.
- **The read of the claims** is in
  [`results/2026-10-12-line-attribution.reading.json`](results/2026-10-12-line-attribution.reading.json):
  60 runs made a claim. In none does a claim say the line is or does something the code
  contradicts. In 26 a claim says something about the line that is true of the code or the patch
  shown and that no source states, such as "this line returns the index when the element
  matches". Six are borderline. Two runs of `ws-revert-story` misread a commit message, saying
  the storefront hid a stock figure the commit says it kept showing; the audit caught one of
  the two.
- **Told not to explain the code, the writer still does.** Six wordings of that rule were tried
  on the twelve real lines, among them a private field for remarks about the code and a rule
  that the change must be the subject of every sentence. None stopped it, and the audit holds a
  claim at weak when its one sentence carries a remark about the code that no source makes.
  That is where `q-796` lost a run here.
- **`ws-skew-value` abstained in its three scored runs**, where it had answered as recorded in
  every run of 11 Oct. One case, so it says nothing yet about
  [#32](https://github.com/maricastroc/understory/issues/32).
- **Cost.** On the same 36 cases, a synthesis call reads about 2,010 tokens where it read 1,400,
  the rules and the code. The whole run used the same tokens per investigation, about 3,900,
  because an answer that abstains is not audited: 96 claim audits against 151. US$ 0.093 against
  US$ 0.095. Collection makes one more request to GitHub per investigation, for the commit's
  patch.

**Against the acceptance criteria of #31**, read with the rule in
[What counts as evidence](#what-counts-as-evidence-and-for-what):

- No run of the four incidental cases fails its rubric, in four passes. Met.
- No run of `ng-http-411` says the line does something it does not. Met.
- "A new read finds no statement about a line that no source supports." The read finds none
  that the code or the patch contradicts. It finds 26 runs that say something true of the code
  or the patch that no source repeats, which the rule does not count against an answer, and
  six borderline runs, listed there. It also finds two runs of `ws-revert-story` that misread a
  commit message. That failure is real, is not about a line, and is on `main` too.
- "The recorded cases that passed both runs on 11 Oct still pass both." With its rubric,
  `ng-http-411` did not pass on 11 Oct, so it is no longer in that set. It is still expected to
  pass and does not: that is the audit, in #43, and the writer abstaining, in
  [#39](https://github.com/maricastroc/understory/issues/39). `machine-168` and `q-796` lose
  runs here that they also lose on `main` the same night.

So what #31 reports, a change's reasons given to a line it only touched, is gone in these
runs. What keeps one recorded case from passing is narrower and has its own issue.

### The audit against written controls

Everything above measures the audit on claims the writer happened to make. The controls in
[`audit-controls.json`](audit-controls.json) are claims written to have a known answer, about
lines of the gold set:

- Three kinds should be credited: claims true of the code and backed by a source, claims true
  of an earlier version of the code and backed by the commit that wrote it, and claims that
  give a line the reason the source gives for the very part of a change it belongs to.
- Seven should not. Claims the code or the patch contradicts. Claims that give a reason no
  source gives. Claims that only read the code back. Claims that say of an earlier version what
  its commit contradicts. And three kinds of borrowed reason: the reason a source gives for
  another part of the change, the same in the source's own words, and the reason of another
  change in the line's history.

**The audit as it is**, commit `b798b88`: the 93 claims kept in the run of 12 Oct and the 53
controls, each judged four times on 12 Oct at 14:49 UTC, through OpenRouter pinned to Groq
([`results/2026-10-12-patch-context-replay-one-question.jsonl`](results/2026-10-12-patch-context-replay-one-question.jsonl)).
These are the lines `npm run eval:audit` prints for the file, and a unit test fails if they
drift apart.

```text
Claims given the same verdict on every replay: 80 of 93 (86%).
  recorded, synthetic: 49 of 51 (96%)
  recorded, sampled: 15 of 19 (79%)
  incidental, sampled: 4 of 8 (50%)
  recorded, picked: 12 of 15 (80%)
Verdicts: 298 supported, 72 weak, 0 unsupported over 370 judgements; 2 errored.
Supported verdicts lost to a quote the source does not contain: 2 of 300 (1%).
Judgements answered by the fallback model: 16 of 370 (4%).
Control, each claim against another repository's sources: 0 of 93 (0%) came back supported.
true of the code and backed by a source, expected supported: 23 of 40 (57%) as expected. 23 supported, 17 weak, 0 unsupported; 0 errored.
  missed 4 of 4: ng-http-411, "This line was added as part of a JSDoc comment documenting the new XSRF‑token‑wh"
  missed 4 of 4: ng-http-411, "This line was added as part of a documentation block that provides an example fo"
  missed 3 of 4: ng-http-114, "The line was rewritten to take an index argument in the forEach callback, in the"
  missed 2 of 4: q-306, "This line returns the current index when the array element equals the searched v"
  missed 4 of 4: tslint-189, "The condition was rewritten from `!== undefined` to `=== undefined` by commit 8b"
says something the code or the patch contradicts, expected not supported: 32 of 32 (100%) as expected. 0 supported, 14 weak, 18 unsupported; 0 errored.
gives a reason no source gives, expected not supported: 32 of 32 (100%) as expected. 0 supported, 32 weak, 0 unsupported; 0 errored.
gives the line a reason the source gives for another part of the change, expected not supported: 2 of 8 (25%) as expected. 6 supported, 2 weak, 0 unsupported; 0 errored.
  missed 2 of 4: machine-32, "The code at libmachine/host/host.go line 32 was changed because earlier modifica"
  missed 4 of 4: tslint-257, "This line was added by commit 63fc794 so that rules are no longer responsible fo"
true of the code, with no reason given, expected not supported: 12 of 12 (100%) as expected. 0 supported, 12 weak, 0 unsupported; 0 errored.
gives the line, in the source's words, the reason of another part of the same change, expected not supported: 20 of 32 (63%) as expected. 12 supported, 20 weak, 0 unsupported; 0 errored.
  missed 4 of 4: tslint-189, "The condition was rewritten to allow uncompiled custom formatters, as uncompiled"
  missed 4 of 4: tslint-189, "The condition was rewritten so that the formatter module is first resolved relat"
  missed 4 of 4: machine-32, "This type was added so that hosts can still be marshaled and unmarshaled, which "
gives the last change the reason of another change in the line's history, expected not supported: 15 of 16 (94%) as expected. 1 supported, 15 weak, 0 unsupported; 0 errored.
  missed 1 of 4: ws-revert-story, "The sync job first dropped every row with a zero quantity because zero is also w"
true of an earlier version of the code and backed by the commit that wrote it, expected supported: 19 of 20 (95%) as expected. 19 supported, 1 weak, 0 unsupported; 0 errored.
  missed 1 of 4: ws-revert-story, "The sync job first dropped every row with a zero quantity, because the vendor em"
says of an earlier version what the commit that wrote it contradicts, expected not supported: 12 of 12 (100%) as expected. 0 supported, 4 weak, 8 unsupported; 0 errored.
gives the line the reason the source gives for the part of the change it belongs to, expected supported: 8 of 8 (100%) as expected. 8 supported, 0 weak, 0 unsupported; 0 errored.
```

Read with these:

- **What the code contradicts, what no source says and what only reads the code back is never
  credited**: none of 32, 32 and 12 judgements. Nor is a false statement about an earlier
  version of the code, none of 12.
- **A claim that should be credited is credited in 50 judgements of 68.** The 18 misses are
  nearly all claims true of the code and backed by a source, held at weak because no source
  repeats what the code shows. That is
  [#43](https://github.com/maricastroc/understory/issues/43).
- **A borrowed reason is credited in 19 judgements of 56.** The audit checks that a reason is in
  the cited source. It does not check that the reason is the line's. It refuses most borrowed
  reasons only by being strict with every claim, the true ones included, and it credits every
  time the ones written for `tslint-189` and one of the two written for `machine-32`. That is
  [#49](https://github.com/maricastroc/understory/issues/49). What keeps a borrowed reason out
  of an answer is the writer abstaining ([Line attribution after #31](#line-attribution-after-31)).

### Where a verified passage sits, and what that does not say

Run on 13 Oct 2026, with no model. `npm run eval:origins -- <out.json>` collects again the
evidence of every case that has a verified passage in a kept run or in a kept judgement of a
written control, and keeps two things about each passage, both read from the record
([`results/2026-10-13-passage-origins.json`](results/2026-10-13-passage-origins.json)):

- **The part of the record it sits in.** A commit's title or the rest of its message. The title
  of a pull request or of an issue, its description, or the discussion under it. A review's
  summary or one of its comments, with where the comment was made when it has a position. These
  are the distinctions the collected text carries, and no finer one: a comment in a discussion
  has no position and no state, and a description is one block whatever it lists.
- **The change it belongs to.** The commit its source hangs from, whether that is the change
  that last changed the line, and, for each change in the line's history, what it did to the
  line.

`npm run eval:present` projects the kept claims onto what a reader would be shown
([`results/2026-10-12-presentation.json`](results/2026-10-12-presentation.json)). It now reads
the origins when they are there and prints them beside each presentation. It presents no claim
differently for them: a unit test compares the projection with the origins and without.

**Provenance is not pertinence.** Where a passage sits says where a sentence was written, and
for which change. It does not say that the sentence is the reason for the investigated line,
that it is about the part of the change the line belongs to, or that what it describes was kept
in the change as merged. These are the lines `npm run eval:present` prints for the 53 written
controls, and a unit test fails if they drift apart.

```text
Written controls: 110 verified passages

where each passage sits in the record
  true, inferred from the last change: 15 commit title · 8 pull request description · 4 pull request title
  true, not established: 3 commit title
  true, documented for the line: 4 commit message · 3 commit title · 1 commit title + commit message
  false, not established: 5 commit message · 5 commit title · 3 pull request description · 1 commit title + commit message
  borrowed, inferred from the last change: 12 pull request description · 6 pull request discussion
  borrowed, not established: 7 commit title · 6 commit message · 3 pull request description · 2 pull request discussion · 1 review comment, another file
  borrowed, told of an earlier change: 2 commit title
  true, told of an earlier change: 11 commit message · 7 commit title · 1 commit title + commit message

the change each passage's record belongs to
  true, inferred from the last change: 27 the last change
  true, not established: 2 the last change · 1 an earlier change
  true, documented for the line: 8 the last change
  false, not established: 14 the last change
  borrowed, inferred from the last change: 18 the last change
  borrowed, not established: 15 the last change · 4 an earlier change
  borrowed, told of an earlier change: 2 an earlier change
  true, told of an earlier change: 19 an earlier change
```

Read with these:

- **A borrowed reason and a true one sit in the same parts of the record.** Of the passages
  behind a claim that would be presented as an inference, a pull request description holds
  eight of a true claim and twelve of a borrowed reason. The twelve are `tslint-189` and
  `tslint-257`, each one item of a description that lists several changes, and the items quoted
  for `tslint-189` have the origin of the item its own hunk carries out.
- **The six in a discussion are one line, and the place is not what is wrong with them.**
  `machine-32` quotes a comment about an approach the pull request later dropped. The comment
  that says the approach was revised sits in the same discussion, and the record does not tell
  the two apart. A discussion can also hold the reason: passages quoted for `apollo-http-10`
  sit in the discussion of an issue.
- **A title is behind 19 passages of a true claim and none of a borrowed reason**, and that is
  no rule either. In the kept runs of the earlier pipelines, 15 passages behind an inference
  in an answer whose kept verdict is a fail sit in a title.
- **A reason that belongs to an earlier change keeps that change.** On `ws-batch-size` the
  passage about the 413 is tied to the commit that took the size from 500 to 250, not to the
  rename that last changed the line. All 19 passages of a true claim told of an earlier change
  belong to an earlier change, and so do the two of the borrowed reason credited there, which
  is located in both commits its control cites.
- The 23 judgements of a true claim presented as an inference give 27 passages, because the
  passage quoted for `machine-168` is the title of its commit and of its pull request.
- No source is read for this beyond what collection already returns, and nothing here is
  judged: 161 passages in 20 cases, every one located.

### How long the walk takes, and whether it is cancelled

Run on 21 Oct 2026, with no model. `npm run eval:walk -- <out.json> [passes]` collects each case
of the gold set once and walks back through its line's history three times with the limits the
app uses (six requests, four seconds, three earlier changes). On a hosted repository it walks
three more times with the time limit cut to 300 ms, to see what happens to a request in flight
on a real network ([`results/2026-10-21-walk-latency.json`](results/2026-10-21-walk-latency.json)).
The same script run on `main` before #71 is kept beside it
([`results/2026-10-21-walk-latency-before-71.json`](results/2026-10-21-walk-latency-before-71.json)).

| Repository                     | Walks           | p50    | p95      | Max      | Requests per walk       |
| ------------------------------ | --------------- | ------ | -------- | -------- | ----------------------- |
| Hosted, through the GitHub API | 36, on 12 cases | 377 ms | 2,617 ms | 2,690 ms | 1 in 24, 3 in 6, 5 in 6 |
| Seeded, through git            | 72, on 24 cases | 69 ms  | 145 ms   | 170 ms   | none over HTTP          |

- **Within its limits.** No walk reached the four-second limit or the ceiling of six requests.
  33 of the 36 hosted walks reached the change that added the line. The three of `tslint-189`
  stop at `no patch`: the third commit they read comes back without a patch for the file.
- **Cancelled when cut.** With the limit at 300 ms, each of the 36 hosted walks stopped at the
  limit with one request in flight, and that request was aborted at the cut, between 301 and
  304 ms. Before #71 the same 36 requests ran to their end, each with a 200, between 8 and
  132 ms after the walk had returned.
- **Beside the answer.** The answer's time is the one kept for each case in the current run,
  for the writer and the audit through OpenRouter pinned to Groq: 1.9 s at the median over all
  cases. Only `tslint-189` walks for longer than its answers took, 2.2 to 2.7 s against a
  median of 1.4 s. The app sends the answer before it waits for the walk, so there the earlier
  history arrives about a second after the answer.
- **The first request.** On a hosted repository the walk first reads again the commit that last
  changed the line, which collection already has. That request takes 363 ms at the median and
  39% of the hosted walks' time, and in 24 of the 36 walks, where that commit added the line, it
  is the whole walk. Reusing what collection returned would save it; nothing here changes that.
- **What it does not show.** Twelve real lines from six repositories, on one network, in one
  afternoon. The answers' times come from another day and another route: the app calls Groq
  directly.

### What a test of pertinence would be shown

Prepared on 21 Oct 2026 for issue 49, with no model. Nothing here is judged, and no test of
pertinence exists yet. `npm run eval:pertinence -- <out.json>` takes every sentence the core
presents today as a likely explanation and builds what a test would be shown to say whether the
sentence's reason is the line's or belongs elsewhere
([`results/2026-10-21-pertinence-contexts.json`](results/2026-10-21-pertinence-contexts.json)):
the sentence, its verified passages with their place in the record, the line, and a map of the
change it sits under. The map names every file the change touched and every hunk. The hunk that
holds the line is marked, with six rows on each side and the line itself marked. The other
changed rows are spread across the hunks within a budget, one row of each hunk at a time, the
line's own hunk first and its rows by distance from the line. Each row carries its number, so
that another part of the same file, or of the same hunk, can be told from the line.

Where a borrowed reason belongs was read from the patches and written down before any model is
asked, in [`pertinence-expectations.json`](pertinence-expectations.json), for the 14 written
controls that borrow one and the 12 true ones presented today: another part of the same file,
another file, not in the change, or another change. Each says whether the patch or the record
shows it or whether it is a judgement; three are judgements and are never scored. The test
proposed on these contexts, its question, how its answers are settled and scored, and its cost,
are in [`pertinence-replay.md`](pertinence-replay.md). It has not been run.

- **What would be tested.** 656 sentences: from the written controls, 18 borrowed reasons and 23
  true ones under the last change, and 19 true ones under an earlier change; from the current
  run, 61; from the earlier pipelines, 535. All sit under 24 changes, every one read, with the
  line found in each.
- **A borrowed reason can sit in the line's own hunk.** The enable/disable reason given to
  `tslint-257` sits 35 rows above the line, in the same hunk.
- **What the budget cuts.** The smallest budget that keeps every row a presented borrowed reason
  belongs to is 32,000 characters:

  | Budget    | Changes cut elsewhere | In the line's hunk | `tslint-189` | `tslint-257` |
  | --------- | --------------------- | ------------------ | ------------ | ------------ |
  | 8,000     | 5 of 24               | 3                  | cut          | cut          |
  | 16,000    | 4                     | 2                  | kept         | cut          |
  | 32,000    | 3                     | 1                  | kept         | kept         |
  | unbounded | 0                     | 0                  | kept         | kept         |

  At 32,000 the three still cut are `draft-644` (85 files), `tslint-257` and `apollo-http-10`,
  and 87 of the 656 sentences sit under them. A context is then 1,217 characters at the median
  and 39,208 at most.

- **What a cut does to an answer.** Whether the context was cut is recorded for each sentence,
  apart from whatever a model answers. A replay will keep "insufficient evidence" and
  "indeterminate" apart from each other and from an answer given on a cut context, and will
  count, by case, the borrowed reasons still shown and the true ones hidden under each rule of
  hiding, without choosing one in advance.
- **Kept out of the evidence.** An answer's evidence is 2,665 characters at the median and 26,089
  at most. The map of a large change at 32,000 is up to 38,535, and the 24 changes' patches
  together are 275,413. On GitHub, collection already receives every file of the last change in
  one response, keeps the line's own patch and drops the rest. Here the eval asks the same
  endpoint again, and nothing is added to the evidence.

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

## Why it exists

Two payoffs. First, it guards the behaviour that _is_ the product, and it now names where that
behaviour breaks. Second, it puts design choices to a test. The out-of-scope check is done
inside the single synthesis call rather than by a separate classifier. No out-of-scope question
has ever received a claim: 15/15 in July and 14/14 in September on three questions, 18/18 in
October on nine. That supports keeping the single call as far as refusing goes. It does not
settle the label, which wavers between "out of scope" and "not recorded" on questions near the
code.
