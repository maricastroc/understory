<h1 align="center">
  <br>
  <img src="public/understory-symbol.svg" alt="Understory" width="40">
  <br>
  Understory
  <br>
</h1>

<h4 align="center">Software archaeology for a line of code — every claim checked against real evidence.</h4>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Groq-F55036?style=for-the-badge&logo=groq&logoColor=white" alt="Groq" />
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-how-it-works">How It Works</a> •
  <a href="#-design-notes">Design Notes</a> •
  <a href="#ℹ%EF%B8%8F-how-to-run-the-application">How To Run</a> •
  <a href="#-license">License</a>
</p>

<p align="center">
  Point at any line and get back <em>why</em> that code exists, reconstructed from the commits, PRs, issues and reviews that shaped it. Not a plausible story: every claim is checked against real evidence, and when the trail is cold, it says so.
</p>

<br/>

## 🕵️ Features

|                                           |                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **🔗 Verifiable why**                     | Every sentence in the answer is backed by a real artifact — a commit, PR, issue or review — cited by exact id and linked so you can open the source.                                                                                                                                                                                                                           |
| **⛓️ Provenance chain, gaps and all**     | The causal path from motivation to change — issue → PR → review → commit — drawn at its real depth in time, with the missing links (no PR, no review, no linked issue) marked explicitly: `∅` when the provider was asked and has nothing on record, `?` when absence could not be confirmed. The gaps _are_ the signal: they mark exactly where the recorded reason runs out. |
| **🤐 Honest abstention**                  | When the history genuinely doesn't explain a line, it says so (`recorded: false`) and scores low, instead of inventing a motivation. Silence is a result.                                                                                                                                                                                                                      |
| **✅ Grounding check**                    | A deterministic pass compares every citation against the collected evidence. Any id the model made up is flagged as a fabrication — no LLM in the loop.                                                                                                                                                                                                                        |
| **🔬 Substantiation, not just existence** | A second, equally-boxed LLM pass confirms each cited source actually _supports_ the claim — it may only say so by quoting the source verbatim, and a deterministic gate checks that quote is real. A genuine source pinned to the wrong reason is caught as a misattribution and docks confidence; being real is no longer enough.                                             |
| **📊 Confidence, not vibes**              | A 0–100 score derived only from real signals — grounding, abstention, and how many primary sources corroborate the answer — never from the model itself.                                                                                                                                                                                                                       |
| **🔎 Drill into any exhibit**             | Every cited commit, PR, issue or review is a doorway: click **Investigate** to open a fresh, equally-grounded case anchored on that artifact — pulling in the discussion (review threads, issue comments, linked PRs) the line trail never surfaced. The child case links back to its parent and shows the origin question it was drilled from.                                |
| **🌐 No clone required**                  | GitHub **and GitLab** repos are read straight from the API — line-level blame plus PR/MR, issue and review enrichment — so nothing is cloned; local paths use `git` on disk.                                                                                                                                                                                                   |
| **🏢 Self-hosted GitLab**                 | Point it at a private, firewalled GitLab and it collects through the GitLab REST API in-process — a single container inside your network, or that same container acting as a collector for a public UI. See [Private GitLab](#-private-gitlab-self-hosted).                                                                                                                    |
| **🔐 Sign in & pick up later**            | Sign in with GitHub to investigate private repos with your own token and to keep a persistent case file — every investigation is saved to Postgres and restored across sessions and devices.                                                                                                                                                                                   |

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

| Category        | Technologies                                                                                                                                                                                                      |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Framework**   | Next.js 16 (App Router), React 19                                                                                                                                                                                 |
| **Language**    | TypeScript 5                                                                                                                                                                                                      |
| **Styling**     | Tailwind CSS v4                                                                                                                                                                                                   |
| **AI**          | Vercel AI SDK (`ai`) + `@ai-sdk/groq` — `generateObject` on a Zod schema                                                                                                                                          |
| **Model**       | Groq inference — synthesis on `openai/gpt-oss-120b` (`GROQ_MODEL`); citation audit on `openai/gpt-oss-20b` (`GROQ_AUDIT_MODEL`), retried on `openai/gpt-oss-120b` when a call fails (`GROQ_AUDIT_FALLBACK_MODEL`) |
| **Evidence**    | GitHub GraphQL blame + REST enrichment, GitLab REST v4 (blame + MR / issue enrichment), or local `git log -L` / blame                                                                                             |
| **Validation**  | Zod 4 (structured LLM output + input parsing)                                                                                                                                                                     |
| **Auth**        | GitHub OAuth (`read:user repo`), HMAC-signed session cookie — no auth library                                                                                                                                     |
| **Persistence** | PostgreSQL via Prisma 6 — saved investigations scoped per user                                                                                                                                                    |
| **Runtime**     | Node.js API routes — `/api/dig`, `/api/repo`, `/api/file(s)`, `/api/blame`, `/api/overview`, `/api/history-map`, `/api/auth/*`, `/api/investigations`                                                             |
| **Deploy**      | Vercel (public UI); for private GitLab, a Docker container on-prem — on its own, or as the collector behind the public UI                                                                                         |
| **Tooling**     | ESLint, Prettier (+ Tailwind plugin), Vitest, tsx                                                                                                                                                                 |

<br/>

## 📝 Project Description

Understory answers the question `git blame` can't: **why** is this code the way it is?

You paste a GitHub repo (or a local path), find a file, and click the line you're curious about. The app blames that line down to the commits that touched it, then follows the trail outward — the pull requests those commits belonged to, the issues those PRs closed, the reviews left on them — assembling a single, chronological body of evidence.

It then asks a language model to reconstruct the reasoning **using only that evidence**, and — crucially — it doesn't take the model's word for it. Every citation is checked against the real artifacts before anything is shown. If the model cites something that doesn't exist, it's caught. If the evidence simply doesn't explain the line, the answer is marked _inconclusive_ rather than dressed up as fact.

The result is presented as a **case**: the answer broken into clauses, each lettered with the sources it cites; the code at the investigated revision with its blame; a **bore** that drops from the line down through its history — commits, PRs, reviews and issues at their real age — marking where the trail breaks; an evidence drawer with every source and its verified quotes; and a verdict popover listing every honesty signal behind the confidence. A case drilled from an artifact (not a line) opens as a case file with the findings, the provenance chain, the evidence cards and a timeline.

**Additional features:**

- **Two ways to collect, zero setup for public repos:** GitHub repos are read entirely through the API — line-level blame via GraphQL, then PRs, issues and reviews enriched per commit — so nothing is cloned. Local paths use `git` directly; remote repos that must be read on disk fall back to a shallow `--single-branch` clone (depth configurable via `CLONE_DEPTH`).
- **Drill-down that stays grounded:** Any exhibit in a case is a launchpad for the next one. Clicking **Investigate** on a commit / PR / issue / review runs the _same_ collect → synthesize → verify pipeline, but anchored on that artifact instead of a line — gathering the artifact's own body plus the immediate discussion the line trail skips (review-comment threads, issue comments, a PR's commits, linked PRs). So a follow-up is as grounded and abstention-honest as the first question, never a free-associating chatbot. The button previews the exact question it will ask, and the resulting case threads back to its parent with the origin question it descends from.
- **Fabrication-proof citations:** The verification step ([`packages/core/src/verify.ts`](packages/core/src/verify.ts)) is pure and deterministic — it intersects the model's citations with the set of real artifact ids and surfaces any it invented. The LLM never gets to vouch for its own sources.
- **Confidence you can audit:** The score is a function of concrete signals only — is the answer grounded, did the history actually record a reason, and how many primary sources corroborate it — mapping to `high` / `medium` / `low` with the source counts shown in the UI.
- **Graceful without a key:** With no `GROQ_API_KEY` set, the app still collects and displays all the evidence — it just skips the synthesized answer instead of failing.
- **A daily AI cap:** with Upstash configured, `AI_DAILY_LIMIT` caps how many investigations a day reach the model across all visitors. Past it, an investigation falls back to the evidence and provenance chain, exactly as without a key. Model output is also capped: 4,000 tokens for the synthesis and 1,000 per citation audit.
- **Sign in with GitHub:** Optional OAuth (`read:user repo`) that unlocks private repos — the session carries your own token into the blame query — and gives each user their own persistent case file. The session is a plain HMAC-signed cookie; there's no auth framework in the stack.
- **Case history that persists:** Each investigation is saved in a left rail with its question and status (resolved, not recorded, evidence only, out of scope, fabrication caught), with drilled cases nested under their parent. Signed in with a database configured, line cases are written to Postgres (via Prisma, scoped per user) and restored on any device; without either, the rail stays in memory for the session.
- **A terminal companion:** `npm run dig` runs the same collect → synthesize → verify pipeline from the CLI, with `--why`, `--dry-run` (prints the exact prompt without calling the model) and `--json` flags.
- **Substantiation, not just existence ([`packages/core/src/entail.ts`](packages/core/src/entail.ts)):** a second LLM layer, boxed exactly like synthesis — it may only rule a citation _supported_ if it copies a verbatim snippet from the source, and a deterministic `verifyQuote` gate confirms that snippet is really there. Only a genuine misattribution — a real source that doesn't back the claim — lowers confidence. It runs on every investigation, default-on (set `ENTAILMENT=0` to disable), on `openai/gpt-oss-20b` with a one-time retry on `openai/gpt-oss-120b` when a call fails, and degrades gracefully to existence-grounding if both fail.

<br/>

## 🔬 How it works

The pipeline is a handful of stages, and the two that touch an LLM are boxed on both sides — collection is deterministic before them, grounding and scoring are deterministic after — which is what makes the output trustworthy:

```
a line (or a range of lines)
   → blame at the investigated revision (GitHub GraphQL / local git)
   → enrich: commits → PRs → issues → reviews         [deterministic]
   → synthesize the "why" from evidence only           [LLM · generateObject]
   → check each cited source substantiates the claim   [LLM · verbatim-quote gate]
   → verify every citation against real ids             [deterministic]
   → score confidence from real signals only            [deterministic]
   → case (clauses · bore · evidence drawer · verdict)
```

**Collect ([`packages/core/src/collect`](packages/core/src/collect)).** A location is blamed to the commits that shaped it. On GitHub, a single GraphQL blame query returns the commit ranges, and each commit is enriched with its associated PR, that PR's reviews, and the issues it closed. Every commit, PR, issue and review becomes an `Artifact` with a stable id (`commit:sha`, `pr:812`, `issue:1187`, …), deduplicated and sorted oldest-first. The same stage can also be **anchored on an artifact instead of a line** (the drill-down): given a PR, issue or commit, [`collect/github/context.ts`](packages/core/src/collect/github/context.ts) gathers that artifact's body plus its immediate discussion — review-comment threads, issue comments, a PR's commits, cross-referenced PRs — folded into the same `Artifact` list, so synthesis and verification treat it identically.

**Synthesize ([`packages/core/src/synthesize.ts`](packages/core/src/synthesize.ts)).** The evidence is rendered as an id-tagged list and handed to the model with a strict system prompt: explain the _why_ using **only** the evidence, back every claim with an exact artifact id, and if the evidence doesn't explain it, set `recorded: false` and admit it. Output is forced through a Zod schema — `{ answerable, claims: [{ text, citations }], answer, recorded }` — so every claim carries its own citations, and a question the history can't speak to comes back as `answerable: false` instead of an answer.

**Check entailment ([`packages/core/src/entail.ts`](packages/core/src/entail.ts)).** Grounding proves a citation is _real_; entailment proves it's _relevant_. A second model pass audits each cited source against the claim it backs — but it may only answer `supported` by quoting the source verbatim, and the deterministic `verifyQuote` gate rejects any quote it can't find in the artifact body. A `supported` verdict whose quote can't be verified is downgraded to `weak`: it earns no substantiation credit, but an unverifiable quote is not treated as a misattribution — only the judge ruling that a source doesn't back the claim (`unsupported`) lowers confidence. The judge runs on `openai/gpt-oss-20b`; a call that fails technically (an API error — never a `weak` or `unsupported` verdict, never a failed quote check) is retried once on `openai/gpt-oss-120b`. Default-on and best-effort: if the retry fails too, that check is counted as failed rather than dropped, its claim stays unaudited, and an answer with no successful check falls back to existence-grounding.

**Verify ([`packages/core/src/verify.ts`](packages/core/src/verify.ts)).** No model involved. The narrative's citations are intersected with the real artifact ids — a bare commit sha is first resolved to its `commit:` id, but only when it matches exactly one collected commit — and anything left over is a fabrication and the answer is marked ungrounded. Confidence is then computed purely from signals that can't be faked:

| Condition                                                   | Score | Level  |
| ----------------------------------------------------------- | ----- | ------ |
| Fabricated citation (not grounded)                          | 0.20  | low    |
| `recorded: false` (history silent)                          | 0.30  | low    |
| Grounded, 0 primary sources                                 | 0.35  | low    |
| Grounded, citations not audited (entailment off or skipped) | 0.50  | medium |
| Audited, no primary source substantiated                    | 0.55  | medium |
| Audited, 1 primary source substantiated                     | 0.65  | medium |
| The commit that owns the line explains itself               | 0.85  | high   |
| Audited, 2+ primary sources substantiated                   | 0.90  | high   |

Then the caps: a contradiction among the cited sources (a revert, a reopened issue, a declined PR) drops the score to 0.30–0.55, claims without citations cap it at 0.40–0.55, and `high` is never kept on file-level history or when the last touch looks cosmetic. A citation the judge rules a **misattribution** stops counting as a primary source — so a grounded-but-wrongly-attributed answer can't borrow `high` confidence it never earned.

**Gaps are only drawn when they're known.** Collection records, per commit, whether the provider was asked for a PR (`prLookup`: `found`, `none`, `skipped`, `failed`) and, per PR, whether it has reviews and closing issues (`reviewLookup`, `issueLookup`). A missing link is drawn as verified silence (`∅`) only when the lookup answered `none`; skipped, failed or pre-lookup cases draw a neutral, unverified gap (`?`). A PR reached through another commit of the same trail, or a review without text, is not a gap.

<br/>

## 📌 Design notes

The central constraint is that a _why_ answer is worthless unless it's true, and "plausible" is the failure mode language models are best at — a fluent paragraph citing a commit that was never written. The architecture is built to make that failure impossible to hide rather than merely unlikely.

- **The model is boxed between two deterministic layers.** Collection produces the only evidence that exists, and the model cannot reach past it; verification checks every citation against real artifact ids, and the model cannot influence it. The LLM's entire job is to explain within a fixed evidence set — it never sources, never scores, and never vouches for itself.
- **Abstention is a first-class result.** "The history doesn't record why" is a correct, useful answer, not an error to be papered over. The synthesis contract lets the model return `recorded: false`, and the UI treats _inconclusive_ as a real verdict — which is what keeps it from inventing motivations to fill space.
- **Confidence is a function of evidence, not of the model's tone.** The score is computed from signals that can't be faked — is the answer grounded, did the history actually record a reason, how many primary sources corroborate it — so a well-written guess and a well-supported conclusion can't end up looking the same.
- **The UI only shows what the system can back.** Loading never stages steps the API doesn't stream, a case is only called saved across devices when the server actually persisted it, and a missing link is only drawn as silence when the provider was asked. Where a design implied evidence the pipeline can't produce, the design gave way.
- **The trustworthy parts are the boring parts.** Everything that determines whether output can be believed — blame, enrichment, citation grounding, scoring — is deterministic and unit-tested. The probabilistic component is deliberately the smallest, most contained piece of the pipeline.

<br/>

## ⚠️ Limitations

A tool that stakes its value on honesty should be just as honest about its own edges:

- **GitHub blame is last-writer, not full history.** The GraphQL path attributes each selected line to the single commit that _last_ touched it, so a line rewritten several times surfaces only its most recent author — not every commit that shaped it. A local checkout uses `git log -L`, which follows the full evolution of those lines; the no-clone GitHub reading is intentionally shallower in exchange.
- **Large files fall back to file-level history.** When a file is too big for GitHub's blame API (or blame fails), collection switches to the commits that touched the _file_ rather than the specific lines — coarser, and surfaced in the UI with a note so it's never silently passed off as line-level.
- **Entailment is best-effort.** The substantiation pass catches misattributed citations — but it's a second model call: a failed call is retried once on `openai/gpt-oss-120b`, and when that fails too the claim stays unaudited. If no check succeeds, the answer falls back to plain existence-grounding, capped at `medium`.
- **A misattribution lowers confidence, not the verdict.** A case whose history records a reason and whose citations all exist still reads _resolved_ even when the judge rules one of its sources a misattribution; the confidence drops and the verdict popover shows the count.
- **Big investigations trim the prompt.** The synthesis model is rate-limited by tokens per minute, so on large cases the evidence _bodies_ sent to the model are budget-trimmed — every artifact id is always kept, so citations and grounding stay intact, and the full bodies remain visible in the evidence cards.
- **Enrichment is bounded.** On GitHub each commit gets at most one associated PR, five reviews, five closing issues and eight comments per thread, and at most ten commits per investigation are enriched. Reviews and comments written by bots (Copilot, code scanning, changeset and CI bots) are left out, so they neither count as a review nor take a human's place under those limits; on GitLab, up to ten merge requests, whose notes carry no review state, so a missing review or issue stays _unverified_ there. "No linked issue" means no issue closed by a closing keyword. A local commit that was never pushed reports its PR lookup as failed. Remotes that are neither GitHub nor GitLab are read from a shallow clone (`CLONE_DEPTH`, default 150), so a line's local history can be truncated.
- **The code is shown at the investigated revision.** A case reads its code and blame at the sha it recorded; cases saved before revisions were recorded have no blame bars and say the code shown is the current HEAD.

<br/>

## ℹ️ How to run the application?

> Clone the repository:

```bash
git clone https://github.com/maricastroc/understory
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

## 🧪 Development

- **Layout.** `packages/core` holds the pipeline (collect → synthesize → entail → verify) and never imports Next.js, Prisma or Upstash; the web app (`src/`), the CLI (`scripts/dig.ts`) and the VS Code extension (`apps/extension`) are shells over it.
- **Unit tests** — `npm test`. Vitest runs two projects: `node` for `*.test.ts` and `dom` (jsdom + Testing Library) for `*.test.tsx`, with axe checks that skip color contrast, since jsdom computes no colors.
- **Eval** — `npm run eval`. Runs a gold set through the real pipeline, model included, and checks grounding, abstention and out-of-scope refusal. It needs `GROQ_API_KEY` and the seeded demo, and stays out of CI. Results and how to read them are in [`eval/README.md`](eval/README.md).
- **End-to-end** — `npm run test:e2e`. Playwright drives the dev server in the locally installed Chrome, with full axe checks including contrast. It needs the seeded demo (`npm run seed:demo`).
- **Dev previews.** Files named `page.dev.tsx` are only routed in development (`pageExtensions` in `next.config.ts`), so they never reach a production build. They render real components over synthetic fixtures, and the e2e suite runs against them:
  - `/dev/line?state=` `resolved` · `collecting` · `failed` · `empty` · `pending` · `not-recorded` · `evidence-only` · `out-of-scope` · `fabricated` · `misattributed` · `unverified` · `commits-only` · `crowded` · `many-owners`
  - `/dev/composer?state=` `cold` · `partial` · `auto` · `mapping` · `warm` · `outlier` · `unknown`
  - `/dev/specimen?state=` `default` · `expanded` · `unpinned` · `unavailable` · `loading` · `no-literal` · `range` · `long-line`, with `layout=` and `source=demo` to read the seeded demo
  - `/dev/case` — a drilled (artifact-anchored) case
- **Migrations.** Run `npx prisma migrate deploy` before deploying new code. A database still missing the `parentCaseId` column keeps working, but drilled and follow-up cases are saved without their parent link.
- **`turbopack.root`** is pinned to the project in `next.config.ts`: a lockfile higher up the directory tree otherwise makes Turbopack watch the whole home directory.

<br/>

## 🏢 Private GitLab (self-hosted)

Understory also reads **GitLab** — including private, self-hosted instances. The only real constraint is physical: a GitLab behind a corporate firewall isn't reachable from a public host like Vercel, so whatever talks to GitLab has to run **inside the network**. That's this repository's Docker image, which talks to the GitLab REST API in-process; the access token never leaves that network. It can be deployed two ways:

- **Single container (below):** the whole app runs inside the network — no collector, no tunnel.
- **Split deploy:** the UI stays public (e.g. Vercel) and forwards only requests for hosts in `COLLECTOR_HOSTS` to the same container running inside the network as a _collector_, through an outbound tunnel. The public instance sets `COLLECTOR_URL`, `COLLECTOR_HOSTS` and `COLLECTOR_SECRET`; the container sets `COLLECTOR_INBOUND_SECRET` to the same secret and rejects requests without it. See the split-deploy block in `.env.example`.

The GitHub path is untouched; GitLab support is purely additive. Provider is detected from the repo URL's host (`GITLAB_HOSTS`), and every artifact is normalized to the same evidence shape, so blame, enrichment, grounding and scoring all behave identically. On GitLab this covers line investigations, enriched with merge requests, issues and notes; drilling into an artifact is GitHub-only.

> **Prerequisite:** Docker (Desktop or Engine) on a machine that can reach your GitLab host — i.e. on the corporate network / VPN.

> Configure it — copy `.env.on-prem.example` to `.env.on-prem` (gitignored, and excluded from the Docker build context) and set at least a GitLab **access token** and your **host**. Setting `NEXT_PUBLIC_DEFAULT_REPO` to a project is recommended: without it the app opens on the local demo path, which doesn't exist in the image, so it shows "Not a git repository" and asks for one.

```bash
cp .env.on-prem.example .env.on-prem
# GITLAB_TOKEN=glpat-...
# GITLAB_HOSTS=gitlab.company.com
# NEXT_PUBLIC_DEFAULT_REPO=https://gitlab.company.com/group/project
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

> Case history on-prem: cases are saved to Postgres per **signed-in** user, and sign-in (GitHub OAuth) is not configured in this image, so on-prem the case rail keeps cases for the browser session. The bundled Postgres only prepares the schema — uncomment `DATABASE_URL` / `DATABASE_DIRECT_URL` in `.env.on-prem`, then:

```bash
docker compose --env-file .env.on-prem --profile db up -d --build
docker compose --env-file .env.on-prem run --rm app npx prisma migrate deploy
```

> ⏩ Access [http://localhost:3000](http://localhost:3000) (or the host you deploy to).

A **Groq key** is still optional — without it you get the evidence and provenance chain, just not the synthesized answer. Note that `NEXT_PUBLIC_DEFAULT_REPO` (the project the app opens on) is baked in at **build** time, so changing it means rebuilding the image, not just restarting.

<br/>

## 📄 License

Released under the [MIT License](LICENSE). You're free to use, study, fork and build on this code — **as long as the original copyright and license notice are kept**. Reuse it and learn from it; don't strip the attribution and present it as your own.

© 2025–2026 Mariana Castro

<br/>

<div align="center">

⭐ If you like this project, give it a star on GitHub!

</div>
