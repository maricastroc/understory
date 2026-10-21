# A test of pertinence for issue 49: the proposed replay

**Status: a proposal, not run.** No model has been asked anything in this design. Nothing here
changes the audit, the prompts in production, the verdicts, the interface or what the app does.

The audit checks that a reason is in a cited source. It does not check that the reason is the
line's. The core presents a credited change-level reason as a "Likely explanation", and the
written controls of #49 show that a borrowed reason can be shown that way: 18 judgements, three
cases. The hypothesis is that a model shown the whole change can tell a reason that explains the
line from one that belongs to another part of the change, and that a deterministic check on its
answer keeps that judgement honest.

The preparation is in [`results/2026-10-21-pertinence-contexts.json`](results/2026-10-21-pertinence-contexts.json)
and the [README](README.md#what-a-test-of-pertinence-would-be-shown).

## 1. The question

The model answers one closed question with one of five verdicts, and copies one changed row of
the map as the evidence for two of them. The place of that row, not the model, decides between
the line's own part, another part of the same file and another file. Together they give the six
outcomes asked for, plus two that keep a bad answer apart.

| Outcome                                  | Verdict                      | How it is settled, with no model                                                 |
| ---------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------- |
| The reason is the line's                 | `the_line`                   | The cited row is in the line's own block of changed rows                         |
| Another part of the same file            | `another_part`               | The cited row is in the line's file, outside that block (the same hunk included) |
| Another file                             | `another_part`               | The cited row is in another file                                                 |
| An abandoned approach, or another change | `not_in_change`              | No row                                                                           |
| Insufficient evidence                    | `insufficient`               | No row                                                                           |
| Genuinely indeterminate                  | `indeterminate`              | No row                                                                           |
| _kept apart_                             | `the_line` or `another_part` | The row is not in the map: "row not in the map"                                  |
| _kept apart_                             | `the_line` or `another_part` | The row's place contradicts the verdict: "row contradicts the verdict"           |

Nothing compares words. The cited row is looked up exactly, and only its place is used.
Whether a context was cut is a fact about the context, recorded for every sentence apart from
the answer.

### The system prompt

Exactly as in [`scripts/eval-pertinence-prompt.ts`](../scripts/eval-pertinence-prompt.ts):

```text
You read one change to a codebase and decide whether a stated reason explains what that change
did to ONE line, the line under investigation.

You are given the line, a sentence that gives a reason for it, the passage or passages of the
project's record (a commit message, a pull request, a review, an issue) the sentence rests on,
and a map of the whole change: every file it touched, every hunk, the changed rows with their
numbers, and the line marked "← the investigated line". The map may be cut. Where it is, it says how many
rows, hunks or files are not shown, and "⋯" marks rows left out inside a hunk.

That the passage is in the record is established, and so is that the change touched the line.
Do not judge either. The sentence claims that the passage's reason is the line's: do not take its
word for it. Judge only which part of the change the reason is about.

Decide from what the rows do, not from the words they share with the passage. A change often does
several things, and its record often gives a reason for each. A reason for another thing the same
change did does not explain the line, even when it sits in the same pull request, the same file or
the same hunk. A reason that explains the line may explain other parts too.

Answer with one verdict:
- the_line: the reason is why the change added or altered the line as it did.
- another_part: other rows of this change carry the reason out, and the line's own change does not.
- not_in_change: no row of this change carries the reason out. It is about something else, such as
  an approach that was dropped or another change.
- insufficient: what you are shown does not let you tell what the reason is about, because the
  passage is too vague or the part of the change that would tell is not shown.
- indeterminate: you can tell what the reason is about, and it is genuinely open whether it covers
  the line's change.

For the_line and another_part, copy into `row` ONE changed row of the map, exactly as shown, with
its sign and number, that carries the reason out: for the_line, the line itself or a changed row
next to it; for another_part, a row of the part that does. Leave `row` empty for the other
verdicts. Keep `reason` to one short line.
```

### The request and the answer

```text
The line under investigation, as numbered in this change: <path>:<number>
  <the line>
What this change did to it: added it | rewrote it; before, it read: <before> | changed only its spacing

The sentence under review (it claims the reason; it may be wrong):
  <the writer's sentence>

The passage(s) it rests on:
  [<source> · <kind>, <part of the record>] “<verified passage>”

The change: <commit> · <title> · <n> files
<the map of the change, at 32,000 characters>
```

The answer is structured, with `temperature: 0`:
`{ "verdict": "the_line" | "another_part" | "not_in_change" | "insufficient" | "indeterminate", "row": string, "reason": string }`.
The model is never told what the audit concluded, and it is shown no example from the evaluation
set.

## 2. What the model is shown: three real cases, and one true contrast

Every request below is in [`results/2026-10-21-pertinence-prompts/`](results/2026-10-21-pertinence-prompts/),
at 32,000 characters and at 8,000, rendered by `scripts/eval-pertinence-render.ts` with no model.

### `tslint-189`: a reason from another item of the pull request, in another file

- **Line:** `src/linter.ts`, 147 in this change and 189 today: `if (Formatter === undefined) {`. The change rewrote it; before, it read `if (Formatter !== undefined) {`.
- **Sentence:** "The condition was rewritten to allow uncompiled custom formatters, as uncompiled rules were already allowed."
- **Passage:** `[pr:3412 · pull request, description] “* formatterLoader * allow uncompiled custom formatters (we already allow uncompiled rules)”`
- **What the map holds, at 32,000.** The map is complete (9 files):
  - the line's hunk: the inverted check, `getRelativePath` dropped, `const formatter = new Formatter();` moved below;
  - in `src/formatterLoader.ts`, `+ 66 fullPath = require.resolve(formatterPath);`, under the comment that this lets custom formatters written in TypeScript be loaded by ts-node.
- **Expected answer:** `another_part`, settled as **another file**, `src/formatterLoader.ts`. Verifiable: the line's change only inverts a comparison and restructures the branch, and loading is done elsewhere.
- **At 8,000.** `formatterLoader.ts` is still named, with the new `loadFormatter(directory, name, isCore?)` signature and its `isCore` branch, but the `require.resolve` row is among 21 rows not shown. A model can still cite a row of `loadFormatter` and land in the right file. What it can no longer see is the row that actually allows uncompiled formatters, so a careful answer may be `insufficient`.
- **The second borrowed reason**, "resolved relative to the current directory", is the same shape: the row is `+ 78 src = resolve.sync(name, {basedir: process.cwd()});` in `formatterLoader.ts`.

### `tslint-257`: a reason that sits in the line's own hunk

- **Line:** `src/linter.ts`, 185 in this change and 257 today: `const oldSource = fs.readFileSync(filePath, "utf-8");`. The change added it, inside the new `applyFixes`, to read a file other than the one being linted before applying its fixes.
- **Sentence:** "This line was added by commit 63fc794 so that rules are no longer responsible for disabling themselves and failures are filtered after a rule returns them."
- **Passage:** `[pr:2369 · pull request, description] “Move `disabledIntervals` out of rule options. Rules are not responsible for disabling theirselves. Just filter the failures after the rule returns them.”` A second judgement quotes the same item with its leading `*`, so the case has two inputs.
- **What the map holds, at 32,000.** 109 changed rows of 17 files are cut, but none of them is in the line's hunk. That hunk shows `+ 150 return removeDisabledFailures(sourceFile, failures);` in `getAllFailures`, 35 rows above the line, which is where failures are filtered after the rules return them.
- **Expected answer:** `another_part`, settled as **another part of the same file**. Verifiable: the line reads a file to apply fixes, and neither disables a rule nor filters a failure.
- **At 8,000.** Row 150 is among 79 rows of the line's hunk not shown. The model still sees `applyFixes` around the line, and `+ 32 import { removeDisabledFailures } from "./enableDisableRules";` at the top of the file. It can answer `another_part` by citing the import, which settles in the right place. It can also answer `insufficient`, and it cannot quote the row that does the filtering.

### `machine-32`: a reason about an approach the pull request revised

- **Line:** `libmachine/host/host.go`, 33 in this change and 32 today: `type StandardSSHClientCreator struct {`. The change added it.
- **Sentence:** "This type was added so that hosts can still be marshaled and unmarshaled, which an earlier approach had broken."
- **Passage:** `[pr:2493 · pull request, discussion] “It does break the marshaling of a host. Might have to use a different approach.”`
- **What the map holds.** It is complete at both budgets (4 files). It shows:
  - `+ 26 stdSSHClientCreator SSHClientCreator = &StandardSSHClientCreator{}`, the creator kept in a package variable rather than on the host;
  - `SetSSHClientCreator`, to put another creator in its place;
  - in `commands/ssh_test.go`, a `FakeSSHClientCreator` that the tests put in its place.
- **Expected answer: none scored.** This is interpretive:
  - **The case for another part.** The marshaling concern is about where the creator is kept, row 26, not about the type.
  - **The case for not in the change.** The passage describes the approach that broke marshaling, not the one merged.
  - **The case for the line.** The type is part of the revision that stopped breaking marshaling.

  The record never says what the type is for. Its likely purpose, a creator the tests can replace, comes from the code and the pull request's title. The model cannot see the dropped approach, because it is not in the merged change or in the record collected.

### `draft-644` (true), for contrast: the line's reason among two

- **Line:** `src/model/immutable/EditorState.js`, 544 in this change and 644 today: `const prevTreeMap = editorState.getImmutable().get('treeMap');`, rewritten from `var`.
- **Sentence:** "The declaration was rewritten from var to const by commit 8de2db9, which changed the remaining vars in Draft.js to let/const…"
- **Passage:** `[commit:8de2db9 · commit, title] “Change remaining vars to let/const”`
- **What the map holds.** At 32,000 the map of 85 files is cut in 205 places, but the line's own block is always whole. The two files given `* @format`, the commit's other purpose, are still shown.
- **Expected answer:** `the_line`. Verifiable. A test that hides it is hiding a true reason.

## 3. The labels, reviewed

All are in [`pertinence-expectations.json`](pertinence-expectations.json), with what changed since #74 in its `revisions`. Each label is **verifiable** when the patch or the record shows it, and **interpretive** when it depends on judgement. An interpretive label is reported and never scored.

| Control                                                                               | Label                         | Basis            | How it is shown                                                                                                                                                 |
| ------------------------------------------------------------------------------------- | ----------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tslint-189` · uncompiled formatters                                                  | another file                  | verifiable       | `formatterLoader.ts` row 66; the line only inverts its check                                                                                                    |
| `tslint-189` · resolve from the current directory                                     | another file                  | verifiable       | `formatterLoader.ts` row 78                                                                                                                                     |
| `tslint-257` · rules no longer disable themselves                                     | another part of the same file | verifiable       | row 150 of the same hunk filters; the line reads a file for fixes                                                                                               |
| `tslint-257` · `filterFailures` removed                                               | another file                  | verifiable       | `abstractRule.ts` and `eoflineRule.ts`                                                                                                                          |
| `tslint-257` · the `ruleSeverity` review comment                                      | another file                  | verifiable       | The comment's own position: `ruleLoader.ts`, on the row it was made on. Revised: #74 pointed to the row that replaced it                                        |
| `draft-644` · Prettier added                                                          | another file                  | verifiable       | Only the two selection test helpers gain `@format`; `EditorState.js` gains none                                                                                 |
| `apollo-http-10` · `batchKey`                                                         | another file                  | verifiable       | `batchKey` is added only in the batch links                                                                                                                     |
| `apollo-http-10` · multiple subscribers                                               | none                          | **interpretive** | Revised: unsubscribing code moves in the line's file too, and no row can be shown as the fix                                                                    |
| `machine-32` · both                                                                   | none                          | **interpretive** | Revised from "not in the change": the revision the discussion speaks of is in the merged change, beside the line                                                |
| `jitter`, `retry-cap`, `ws-batch-size`, `ws-revert-story` · reasons of another change | not in the change             | verifiable       | Each other commit gives its own reason, which the last change does not carry out                                                                                |
| 12 true controls presented today                                                      | the line's part               | verifiable       | Listed now instead of being assumed. Ten are changes with one purpose. `draft-644` and `apollo-http-10` do several things, and the line's reason is one of them |

Presented today, the replay can score **3 verifiable borrowed clusters** (`tslint-189` × 2 and `tslint-257` × 1, in two cases) and **12 true ones**. The other borrowed controls are not shown today, because the audit did not credit them.

## 4. How the result is measured

- **The unit is a cluster, never a call.**
  - A control is one cluster per change. Its four audit judgements count once, and only distinct passages are asked separately.
  - A run sentence belongs to one cluster per case, change and set of verified passages. A sentence repeated across runs counts once. Up to three distinct sentences of a cluster are asked.
  - Every input is asked three times. A cluster's answer is the one most of its calls give, and a tie is "split", which never hides.
- **Three rules of hiding, none chosen in advance:**
  - hide a located other part, or a reason not in the change;
  - also hide insufficient evidence;
  - also hide indeterminate.

  "Row not in the map" and "row contradicts the verdict" never hide, and are counted apart.

- **For each rule, by kind of cluster, by basis and by case:**
  - **Borrowed reasons caught:** verifiable borrowed clusters hidden, and of those, how many land in the labelled category.
  - **True reasons hidden:** true control clusters hidden.
  - **Runs:** clusters of runs that passed hidden. This is only a proxy for harm, because a run's verdict is not a label of the sentence. Clusters of failed or mixed runs are reported, not scored.
  - **Cut contexts** in a column of their own, and interpretive clusters reported only.
  - **Stability:** the clusters whose calls agree at least two times in three.
- **Counts per call** are reported only as description, never as a rate.

`scripts/eval-pertinence-score.ts` does this, and its tests run it on answers invented for them.

## 5. Cost and latency

**Prices**, read from OpenRouter's public model list on 21 Oct 2026, through OpenRouter pinned to Groq as the eval already runs:

| Model                 | Input, per million tokens | Output, per million tokens |
| --------------------- | ------------------------- | -------------------------- |
| `openai/gpt-oss-120b` | US$ 0.15                  | US$ 0.60                   |
| `openai/gpt-oss-20b`  | US$ 0.075                 | US$ 0.30                   |

**Assumptions:**

- **Input:** 3.5 characters per token, so the 2,227-character system prompt is about 640 tokens.
- **Output:** 900 tokens per call, reasoning included. The kept audit replays average 603 to 675, and these contexts are larger.

| Step                                                              | Calls | Input tokens | 120b     | 20b      |
| ----------------------------------------------------------------- | ----- | ------------ | -------- | -------- |
| Controls: 17 clusters, 19 inputs × 3                              | 57    | 196,000      | US$ 0.06 | US$ 0.03 |
| Controls at 8,000 and 16,000, the five clusters whose map changes | 36    | 144,000      | US$ 0.04 | US$ 0.02 |
| Controls without the sentence, only the passage                   | 57    | 190,000      | US$ 0.06 | US$ 0.03 |
| Runs: 116 clusters, 249 inputs × 3                                | 747   | 2,420,000    | US$ 0.77 | US$ 0.38 |

The proposal is the first three rows on 120b, with the plain controls also on 20b: about **US$ 0.19**. The runs would follow only with a second go-ahead, after the controls are read, for about **US$ 0.77** more. The runner would stop at US$ 1.50 whatever happens.

**Latency per call**, to be measured in the replay, which records each call's time:

- on 120b, about 1.5 to 2.5 s: up to 12,000 tokens read and about 900 written at Groq's speed;
- on 20b, about 1 s.

The writer and the audit together take 1.9 s at the median in the current run.

**In the app**, the test would be one call for each sentence presented as a likely explanation, after the audit, because it needs the verified passage.

- **Run in line, it would add about 2 s** to answers that have such a sentence.
- **So as not to delay the main answer**, the answer and its documented reasons would be sent first, and the likely explanations after the test, as a separate stream line, like the walk. The map would be built from the commit response collection already receives on GitHub, so it needs no new request.

None of this is proposed for the app now.

## 6. Does it test the hypothesis?

- **Too few borrowed cases to estimate a rate.** Three verifiable borrowed clusters in two cases, plus two interpretive ones, can show whether the mechanism works on them, not how often it does. The other borrowed controls (§3) would add up to eight verifiable ones and the interpretive `apollo-http-10` one, but they need a passage written down before the run, because the audit quoted none for them. That is the one way to have borrowed cases the prompt was not written against.
- **The prompt was written looking at `tslint-189`, `tslint-257` and `machine-32`.** They are a development set, and their results must be read as such. The true controls and the runs were not looked at.
- **The labels are mine**, revised once and drafted with an AI assistant. The interpretive ones are kept out of the score, and the verifiable ones say how they are shown.
- **The sentence may lead the model.** It asserts the link. The ablation without the sentence, on the controls, measures how much it does.
- **The model may side with the audit, or with the line.** It is not told the audit's verdict. But the passage is the audit's chosen support, and copying the investigated line is always an easy `the_line`. The true controls and the borrowed ones measure both pulls. Settling the row checks where it is, not that it carries the reason out.
- **Information that is not there.** Three changes are still cut at 32,000. The rest of a pull request's discussion, its earlier commits and an abandoned approach are not shown. Earlier changes are mapped only on the seeded repositories.
- **Answers vary.** Three calls per input, temperature 0, and agreement reported per cluster.
- **The runs are not labelled sentence by sentence**, so they measure harm only as a proxy.
- **Simpler alternatives, and why they do not replace this:**
  - **Rules on where a passage sits or on words it shares.** Already found not to separate the cases, and refused.
  - **Asking the audit with more of the patch.** Already tried for #49, and it changed verdicts and counted true claims as misattributions.
  - **Saying "one of the things this change did" next to the sentence.** Communicates the risk without reducing it.
  - **Skipping changes made of the line's block alone.** These are already documented and never reach the test.
  - **The remaining choice** is the model, which the 20b run on the controls informs.

## 7. The proposal

- **Inputs:** the 17 control clusters presented today (19 inputs), each asked as in §1 at 32,000 characters, three times, on `gpt-oss-120b`. The same on `gpt-oss-20b`. The five clusters whose map changes, again at 8,000 and 16,000 on 120b. The 19 inputs without the sentence, on 120b.
- **Outputs:**
  - for each call: the raw answer, the settled outcome, whether the context was cut, the time and the tokens;
  - for each cluster: its answer, its agreement and its outcome under each rule.
  - Kept in `eval/results/`, like every replay.
- **Before the run, if you want them:** the passages for the borrowed controls not presented today, written into the expectations.
- **References for reading the result**, on the controls and under the strict rule. They are not an authorization to change anything:
  - of the 3 verifiable borrowed clusters, at least 2 hidden, each in its labelled category;
  - none of the 12 true clusters hidden, and at most 1 when insufficient evidence is hidden too;
  - at least 14 of the 17 clusters agree two times in three;
  - at most 10% of the calls settle as a row not in the map or one that contradicts its verdict.
- **Cost:** about US$ 0.19, stopped at US$ 1.50. The runs (US$ 0.77) need a second go-ahead.
- **Limits:** a development set of three cases, a handful of borrowed clusters, labels from one reader, contexts cut on three changes, and a model's judgement. Whatever comes out can be worded only as what the test is built to do, not as a guarantee. #49 stays open whatever it shows.
