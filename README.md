<div align="center">

# Git Investigator

**🕵️ Software Archaeology — for a Line of Code, or a Whole Pull Request**

Point at any line — or paste a pull request — and get back _why_ that code exists, reconstructed from the commits, PRs, issues and reviews that shaped it.<br/>
Not a plausible story: every claim is checked against real evidence, and when the trail is cold, it says so.

<br/>

[![Features](https://img.shields.io/badge/★_Features-1a1a1a?style=for-the-badge)](#-features)
[![Docs](https://img.shields.io/badge/▣_Docs-1a1a1a?style=for-the-badge)](#ℹ%EF%B8%8F-how-to-run-the-application)

</div>

<br/>

## 🕵️ Features

|                                           |                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **🔗 Verifiable why**                     | Every sentence in the answer is backed by a real artifact — a commit, PR, issue or review — cited by exact id and linked so you can open the source.                                                                                                                                                                                                                      |
| **📜 Explain a PR**                       | The same investigation at pull-request scale: paste a PR and it blames the changed (old-side) code against the **base** commit, reconstructs why each touched region existed, and leads with that history — risk surfaces only as a consequence of it. New code with no past is skipped; the recorded trail that _is_ there is grounded and abstention-honest per region. |
| **🧬 PR case file**                       | The result is a full case file, not just a summary: a per-region **genealogy** drawing the issue → PR → review → commit path (and its gaps), a **confidence ledger** that makes each region's score auditable — what was collected, whether every citation resolved, whether the judge could substantiate it in-source — and a **reconstruction panel** counting what the dig actually recovered (files with history, regions explained, origin commits, PRs, reviews, issues).                                                                                                                                                                                                                                                                                       |
| **⛓️ Provenance chain, gaps and all**     | The causal path from motivation to change — issue → PR → review → commit — laid out per commit, with the missing links (no PR, no review, a direct commit) drawn explicitly. The gaps _are_ the signal: they mark exactly where the recorded reason runs out.                                                                                                             |
| **🤐 Honest abstention**                  | When the history genuinely doesn't explain a line, it says so (`recorded: false`) and scores low, instead of inventing a motivation. Silence is a result.                                                                                                                                                                                                                 |
| **✅ Grounding check**                    | A deterministic pass compares every citation against the collected evidence. Any id the model made up is flagged as a fabrication — no LLM in the loop.                                                                                                                                                                                                                   |
| **🔬 Substantiation, not just existence** | A second, equally-boxed LLM pass confirms each cited source actually _supports_ the claim — it may only say so by quoting the source verbatim, and a deterministic gate checks that quote is real. A genuine source pinned to the wrong reason is caught as a misattribution and docks confidence; being real is no longer enough.                                        |
| **📊 Confidence, not vibes**              | A 0–100 score derived only from real signals — grounding, abstention, and how many primary sources corroborate the answer — never from the model itself.                                                                                                                                                                                                                  |
| **🔎 Drill into any exhibit**             | Every cited commit, PR, issue or review is a doorway: click **Investigate** to open a fresh, equally-grounded case anchored on that artifact — pulling in the discussion (review threads, issue comments, linked PRs) the line trail never surfaced. The child case links back to its parent and shows the origin question it was drilled from.                           |
| **🌐 No clone required**                  | GitHub **and GitLab** repos are read straight from the API — line-level blame plus PR/MR, issue and review enrichment — so nothing is cloned; local paths use `git` on disk.                                                                                                                                                                                              |
| **🏢 Self-hosted GitLab**                 | Point it at a private, firewalled GitLab and it collects through the GitLab REST API in-process — a single container inside your network, no separate collector or tunnel. See [Private GitLab](#-private-gitlab-self-hosted).                                                                                                                                            |
| **🔐 Sign in & pick up later**            | Sign in with GitHub to investigate private repos with your own token and to keep a persistent case file — every investigation is saved to Postgres and restored across sessions and devices.                                                                                                                                                                              |

<br/>

## 🛠️ Tech Stack

<p>
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Groq-F55036?style=for-the-badge&logo=groq&logoColor=white" alt="Groq" />
  <img src="https://img.shields.io/badge/Zod-3E67B1?style=for-the-badge&logo=zod&logoColor=white" alt="Zod" />
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/GitHub_API-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub API" />
  <img src="https://img.shields.io/badge/GitLab_API-FC6D26?style=for-the-badge&logo=gitlab&logoColor=white" alt="GitLab API" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
</p>

| Category        | Technologies                                                                                                            |
| --------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Framework**   | Next.js 16 (App Router), React 19                                                                                       |
| **Language**    | TypeScript 5                                                                                                            |
| **Styling**     | Tailwind CSS v4                                                                                                         |
| **AI**          | Vercel AI SDK (`ai`) + `@ai-sdk/groq` — `generateObject` on a Zod schema                                                |
| **Model**       | Groq inference, default `openai/gpt-oss-120b` (override via `GROQ_MODEL`)                                               |
| **Evidence**    | GitHub GraphQL blame + REST enrichment, GitLab REST v4 (blame + MR / issue enrichment), or local `git log -L` / blame   |
| **Validation**  | Zod 4 (structured LLM output + input parsing)                                                                           |
| **Auth**        | GitHub OAuth (`read:user`), HMAC-signed session cookie — no auth library                                                |
| **Persistence** | PostgreSQL via Prisma 6 — saved investigations scoped per user                                                          |
| **Runtime**     | Node.js API routes — `/api/dig`, `/api/explain-diff`, `/api/repo`, `/api/file(s)`, `/api/auth/*`, `/api/investigations` |
| **Deploy**      | Vercel (public UI), or a single Docker container on-prem for private GitLab                                             |
| **Tooling**     | ESLint, Prettier (+ Tailwind plugin), Vitest, tsx                                                                       |

<br/>

## 📝 Project Description

Git Investigator answers the question `git blame` can't: **why** is this code the way it is — whether you point at a single line or paste a whole pull request?

You paste a GitHub repo (or a local path), find a file, and click the line you're curious about. The app blames that line down to the commits that touched it, then follows the trail outward — the pull requests those commits belonged to, the issues those PRs closed, the reviews left on them — assembling a single, chronological body of evidence.

It then asks a language model to reconstruct the reasoning **using only that evidence**, and — crucially — it doesn't take the model's word for it. Every citation is checked against the real artifacts before anything is shown. If the model cites something that doesn't exist, it's caught. If the evidence simply doesn't explain the line, the answer is marked _inconclusive_ rather than dressed up as fact.

The result is presented as a **case file**: a verdict and prose answer, a confidence score, a **provenance chain** tracing the causal path — issue → PR → review → commit — and marking where it breaks, a timeline of the artifacts oldest-to-newest, evidence cards labelled as _cited_ or _supporting_, and a grounding sidebar showing exactly what backs the conclusion.

**Additional features:**

- **Two ways to collect, zero setup for public repos:** GitHub repos are read entirely through the API — line-level blame via GraphQL, then PRs, issues and reviews enriched per commit — so nothing is cloned. Local paths use `git` directly; remote repos that must be read on disk fall back to a shallow `--single-branch` clone (depth configurable via `CLONE_DEPTH`).
- **Drill-down that stays grounded:** Any exhibit in a case is a launchpad for the next one. Clicking **Investigate** on a commit / PR / issue / review runs the _same_ collect → synthesize → verify pipeline, but anchored on that artifact instead of a line — gathering the artifact's own body plus the immediate discussion the line trail skips (review-comment threads, issue comments, a PR's commits, linked PRs). So a follow-up is as grounded and abstention-honest as the first question, never a free-associating chatbot. The button previews the exact question it will ask, and the resulting case threads back to its parent with the origin question it descends from.
- **Fabrication-proof citations:** The verification step ([`packages/core/src/verify.ts`](packages/core/src/verify.ts)) is pure and deterministic — it intersects the model's citations with the set of real artifact ids and surfaces any it invented. The LLM never gets to vouch for its own sources.
- **Confidence you can audit:** The score is a function of concrete signals only — is the answer grounded, did the history actually record a reason, and how many primary sources corroborate it — mapping to `high` / `medium` / `low` with the source counts shown in the UI.
- **Graceful without a key:** With no `GROQ_API_KEY` set, the app still collects and displays all the evidence — it just skips the synthesized answer instead of failing.
- **Sign in with GitHub:** Optional OAuth (`read:user`) that unlocks private repos — the session carries your own token into the blame query — and gives each user their own persistent case file. The session is a plain HMAC-signed cookie; there's no auth framework in the stack.
- **Case history that persists:** Each investigation is saved in a left rail with its question and status (Resolved / Inconclusive / Evidence only). Signed in with a database configured, cases are written to Postgres (via Prisma, scoped per user) and restored on any device; without either, the rail stays in memory for the session.
- **A terminal companion:** `npm run dig` runs the same collect → synthesize → verify pipeline from the CLI, with `--why`, `--dry-run` (prints the exact prompt without calling the model) and `--json` flags.
- **Explain a whole pull request ([`packages/core/src/diff`](packages/core/src/diff)):** the very same `collect → synthesize → verify` engine, entered from a PR instead of a line. It parses the unified diff, blames each changed **old-side** region against the PR's **base** commit (never the head), clusters the hits by origin commit, ranks them by how much recorded history they carry, and explains each region on its own evidence — abstaining where the history is silent. The executive summary leads with _why_ the touched code existed; which regions deserve the closest read falls out of that history, not a risk verdict. Purely-added files have no past, so they're skipped by design.
- **Substantiation, not just existence ([`packages/core/src/entail.ts`](packages/core/src/entail.ts)):** a second LLM layer, boxed exactly like synthesis — it may only rule a citation _supported_ if it copies a verbatim snippet from the source, and a deterministic `verifyQuote` gate confirms that snippet is really there. Only a genuine misattribution — a real source that doesn't back the claim — lowers confidence. It runs on both the line and PR flows, default-on (set `ENTAILMENT=0` to disable), and degrades gracefully to existence-grounding under rate limits.

<br/>

## 🔬 How it works

The pipeline is a handful of stages, and the two that touch an LLM are boxed on both sides — collection is deterministic before them, grounding and scoring are deterministic after — which is what makes the output trustworthy:

```
a line — or every changed region of a PR
   → blame against the base commit (GitHub GraphQL / local git)
   → enrich: commits → PRs → issues → reviews         [deterministic]
   → synthesize the "why" from evidence only           [LLM · generateObject]
   → check each cited source substantiates the claim   [LLM · verbatim-quote gate]
   → verify every citation against real ids             [deterministic]
   → score confidence from real signals only            [deterministic]
   → case file (verdict · provenance chain · evidence · timeline)
```

**Collect ([`packages/core/src/collect`](packages/core/src/collect)).** A location is blamed to the commits that shaped it. On GitHub, a single GraphQL blame query returns the commit ranges, and each commit is enriched with its associated PR, that PR's reviews, and the issues it closed. Every commit, PR, issue and review becomes an `Artifact` with a stable id (`commit:sha`, `pr:812`, `issue:1187`, …), deduplicated and sorted oldest-first. The same stage can also be **anchored on an artifact instead of a line** (the drill-down): given a PR, issue or commit, [`collect/github/context.ts`](packages/core/src/collect/github/context.ts) gathers that artifact's body plus its immediate discussion — review-comment threads, issue comments, a PR's commits, cross-referenced PRs — folded into the same `Artifact` list, so synthesis and verification treat it identically.

**Synthesize ([`packages/core/src/synthesize.ts`](packages/core/src/synthesize.ts)).** The evidence is rendered as an id-tagged list and handed to the model with a strict system prompt: explain the _why_ using **only** the evidence, back every claim with an exact artifact id, and if the evidence doesn't explain it, set `recorded: false` and admit it. Output is forced through a Zod schema — `{ answer, citations, recorded }` — so it's structured, not scraped from prose.

**Check entailment ([`packages/core/src/entail.ts`](packages/core/src/entail.ts)).** Grounding proves a citation is _real_; entailment proves it's _relevant_. A second model pass audits each cited source against the claim it backs — but it may only answer `supported` by quoting the source verbatim, and the deterministic `verifyQuote` gate rejects any quote it can't find in the artifact body. A `supported` verdict with no findable quote is downgraded to a misattribution, which is the only entailment outcome that lowers confidence. Default-on and best-effort: if the judge is rate-limited it's skipped and the result falls back to existence-grounding.

**Verify ([`packages/core/src/verify.ts`](packages/core/src/verify.ts)).** No model involved. The narrative's citations are intersected with the real artifact ids; anything left over is a fabrication and the answer is marked ungrounded. Confidence is then computed purely from signals that can't be faked:

| Condition                          | Score | Level  |
| ---------------------------------- | ----- | ------ |
| Fabricated citation (not grounded) | 0.20  | low    |
| `recorded: false` (history silent) | 0.30  | low    |
| Grounded, 0 primary sources        | 0.35  | low    |
| Grounded, 1 primary source         | 0.65  | medium |
| Grounded, 2+ primary sources       | 0.90  | high   |

With entailment on, a citation the judge rules a **misattribution** stops counting as a primary source — so a grounded-but-wrongly-attributed answer can't borrow `high` confidence it never earned.

**At PR scale ([`packages/core/src/diff`](packages/core/src/diff)).** A pull request is just a different entry point to the same stages. [`diff/parse.ts`](packages/core/src/diff/parse.ts) reads the unified diff into per-file old-side ranges; [`diff/plan.ts`](packages/core/src/diff/plan.ts) coalesces the changed/removed lines into blame targets; [`diff/collect.ts`](packages/core/src/diff/collect.ts) blames each target against the PR's **base** SHA, clusters the results by origin commit, and ranks them by recorded context (a contested or reviewed change outranks a bare commit). Every cluster then flows through the identical `synthesize → entail → verify → score` path — one grounded, abstention-honest finding per region, plus an executive summary that leads with the history rather than a risk verdict. The findings are presented as a case file: each region carries a **genealogy** ([`diff/Genealogy.tsx`](src/components/diff/Genealogy.tsx)) redrawing the issue → PR → review → commit path with its gaps, and a **confidence ledger** ([`diff/ConfidenceLedger.tsx`](src/components/diff/ConfidenceLedger.tsx)) that makes the score traceable — what was collected, whether every citation resolved, whether the judge substantiated it in-source — while a **reconstruction panel** ([`diff/pr-metrics.ts`](src/components/diff/pr-metrics.ts)) counts, distinct-by-id, the files with history, regions explained, and origin commits / PRs / reviews / issues the dig actually recovered.

<br/>

## 📌 Design notes

The central constraint is that a _why_ answer is worthless unless it's true, and "plausible" is the failure mode language models are best at — a fluent paragraph citing a commit that was never written. The architecture is built to make that failure impossible to hide rather than merely unlikely.

- **The model is boxed between two deterministic layers.** Collection produces the only evidence that exists, and the model cannot reach past it; verification checks every citation against real artifact ids, and the model cannot influence it. The LLM's entire job is to explain within a fixed evidence set — it never sources, never scores, and never vouches for itself.
- **Abstention is a first-class result.** "The history doesn't record why" is a correct, useful answer, not an error to be papered over. The synthesis contract lets the model return `recorded: false`, and the UI treats _inconclusive_ as a real verdict — which is what keeps it from inventing motivations to fill space.
- **Confidence is a function of evidence, not of the model's tone.** The score is computed from signals that can't be faked — is the answer grounded, did the history actually record a reason, how many primary sources corroborate it — so a well-written guess and a well-supported conclusion can't end up looking the same.
- **The trustworthy parts are the boring parts.** Everything that determines whether output can be believed — blame, enrichment, citation grounding, scoring — is deterministic and unit-tested. The probabilistic component is deliberately the smallest, most contained piece of the pipeline.

<br/>

## ⚠️ Limitations

A tool that stakes its value on honesty should be just as honest about its own edges:

- **GitHub blame is last-writer, not full history.** The GraphQL path attributes each selected line to the single commit that _last_ touched it, so a line rewritten several times surfaces only its most recent author — not every commit that shaped it. A local checkout uses `git log -L`, which follows the full evolution of those lines; the no-clone GitHub reading is intentionally shallower in exchange.
- **Large files fall back to file-level history.** When a file is too big for GitHub's blame API (or blame fails), collection switches to the commits that touched the _file_ rather than the specific lines — coarser, and surfaced in the UI with a note so it's never silently passed off as line-level.
- **Entailment is best-effort, and a PR's summary isn't verified claim-by-claim.** The substantiation pass now catches misattributed citations — but it's a second model call, so under rate limits it's skipped and the answer falls back to plain existence-grounding. And while every _region_ finding is grounded and entailment-checked, a pull request's **executive summary** is prose synthesized over those findings; it isn't itself citation-verified line by line, so read it as the grounded findings' headline, not a separately-audited verdict.
- **A PR's brand-new code has no past to recover.** The diff investigation only blames the **old-side** lines a PR changes or deletes — code being modified or removed. Purely-added files and lines have no prior history, so they're skipped by design (there's nothing to reconstruct) and the empty state says so; on very large PRs the changed regions are ranked and budget-capped, with the trimming surfaced in the triage counts rather than hidden.
- **Big investigations trim the prompt.** The synthesis model is rate-limited by tokens per minute, so on large cases the evidence _bodies_ sent to the model are budget-trimmed — every artifact id is always kept, so citations and grounding stay intact, and the full bodies remain visible in the evidence cards.
- **The reconstruction panel counts what was recovered, not what exists.** A PR's counts — files with history, regions explained, origin commits, PRs, reviews, issues — reflect only what this dig actually pulled in. Because blame is last-writer, large PRs are ranked and budget-capped, and added code has no past, the panel is a summary of the recovered trail, not a coverage guarantee that everything shaping the PR was found.

<br/>

## 🔒 Data & privacy

A tool that stakes its value on honesty has to hold itself to the same standard on the data it collects. When a database is configured, Git Investigator keeps an **anonymous** log of the questions asked — used only to understand what people actually want to know and make the investigations better.

- **Recorded:** the question, the repository, and the file location.
- **Never recorded:** your identity, your GitHub token, or the investigation's result — the log is not linked to any user.
- **Opt out per question:** a _"Don't log this question"_ checkbox sits beside the composer; your choice is remembered in your browser.
- **Turn it off entirely:** set `CAPTURE_QUESTIONS=0` and nothing is ever written.

<br/>

## ℹ️ How to run the application?

> Clone the repository:

```bash
git clone https://github.com/maricastroc/git-investigator
```

> Install the dependencies:

```bash
npm install
```

> Copy `.env.example` to `.env.local` and add your keys.
> A **Groq API key** (free, no card — [console.groq.com/keys](https://console.groq.com/keys)) enables the synthesized answer; a **GitHub token** is needed for line-level blame and private repos. The app still collects and shows evidence without either. **GitHub OAuth** (`NEXT_PUBLIC_GITHUB_OAUTH_CLIENT_ID` + secret + `AUTH_SECRET`) and a **`DATABASE_URL`** are optional — they enable "Sign in with GitHub" and persistent, per-user case history.

> Optional — set up the database for persistent history (needs `DATABASE_URL`):

```bash
npm run db:migrate
```

> Seed the bundled demo repo (optional — gives you something to investigate right away):

```bash
npm run seed:demo
```

> Start the dev server:

```bash
npm run dev
```

> Or investigate straight from the terminal:

```bash
npm run dig -- .demo/payments-service src/billing/charge.ts:8 --why "why cap retries at 3?"
```

> ⏩ Access [http://localhost:3000](http://localhost:3000) to view the web application.

<br/>

## 🏢 Private GitLab (self-hosted)

Git Investigator also reads **GitLab** — including private, self-hosted instances. The only real constraint is physical: a GitLab behind a corporate firewall isn't reachable from a public host like Vercel, so the app has to run **inside the network** where it can open a connection to your GitLab. It ships as a single container that talks to the GitLab REST API in-process — no separate collector, no tunnel, no extra moving parts. The access token never leaves that network.

The GitHub path is untouched; GitLab support is purely additive. Provider is detected from the repo URL's host (`GITLAB_HOSTS`), and every artifact is normalized to the same evidence shape, so blame, enrichment, grounding and scoring all behave identically.

> **Prerequisite:** Docker (Desktop or Engine) on a machine that can reach your GitLab host — i.e. on the corporate network / VPN.

> Configure it — copy `.env.on-prem.example` to `.env.on-prem` and set at least a GitLab **access token** and your **host**:

```bash
cp .env.on-prem.example .env.on-prem
# GITLAB_TOKEN=glpat-...
# GITLAB_HOSTS=gitlab.company.com
```

> The token must have the **`read_api`** and **`read_repository`** scopes, and be created **on that same GitLab instance** — a `gitlab.com` token will not work against a self-hosted host. To sanity-check it before wiring it in:

```bash
curl -s -H "PRIVATE-TOKEN: <token>" \
  "https://gitlab.company.com/api/v4/projects/<group>%2F<project>" | head -c 200
# a JSON object (…"id":…) means the token is good; "401 Unauthorized" means scope/instance is wrong
```

> Build and start the container (must run where it can reach your GitLab host):

```bash
docker compose --env-file .env.on-prem up -d --build
```

> Check it's up, follow logs, or stop it:

```bash
docker compose ps
docker compose logs -f app
docker compose --env-file .env.on-prem down
```

> Optional — persist investigation history in the bundled Postgres:

```bash
docker compose --env-file .env.on-prem --profile db up -d --build
docker compose --env-file .env.on-prem run --rm app npx prisma migrate deploy
```

> ⏩ Access [http://localhost:3000](http://localhost:3000) (or the host you deploy to).

A **Groq key** is still optional — without it you get the evidence and provenance chain, just not the synthesized answer. Note that `NEXT_PUBLIC_DEFAULT_REPO` (the project the app opens on) is baked in at **build** time, so changing it means rebuilding the image, not just restarting.

<br/>

## 📄 License

Released under the MIT License. You're free to use, study, fork and build on this code — **as long as the original copyright and license notice are kept**. Reuse it and learn from it; don't strip the attribution and present it as your own.

© 2025–2026 Mariana Castro

<br/>

<div align="center">

⭐ If you like this project, give it a star on GitHub!

</div>
