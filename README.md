<div align="center">

# Git Investigator

**🕵️ Software Archaeology for a Line of Code**

Point at any line and get back _why_ it exists — reconstructed from the commits, PRs, issues and reviews that shaped it.<br/>
Not a plausible story: every claim is checked against real evidence, and when the trail is cold, it says so.

<br/>

[![Features](https://img.shields.io/badge/★_Features-1a1a1a?style=for-the-badge)](#-features)
[![Docs](https://img.shields.io/badge/▣_Docs-1a1a1a?style=for-the-badge)](#ℹ%EF%B8%8F-how-to-run-the-application)

</div>

<br/>

## 🕵️ Features

|                                       |                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **🔗 Verifiable why**                 | Every sentence in the answer is backed by a real artifact — a commit, PR, issue or review — cited by exact id and linked so you can open the source.                                                                                                                                                                                            |
| **⛓️ Provenance chain, gaps and all** | The causal path from motivation to change — issue → PR → review → commit — laid out per commit, with the missing links (no PR, no review, a direct commit) drawn explicitly. The gaps _are_ the signal: they mark exactly where the recorded reason runs out.                                                                                   |
| **🤐 Honest abstention**              | When the history genuinely doesn't explain a line, it says so (`recorded: false`) and scores low, instead of inventing a motivation. Silence is a result.                                                                                                                                                                                       |
| **✅ Grounding check**                | A deterministic pass compares every citation against the collected evidence. Any id the model made up is flagged as a fabrication — no LLM in the loop.                                                                                                                                                                                         |
| **📊 Confidence, not vibes**          | A 0–100 score derived only from real signals — grounding, abstention, and how many primary sources corroborate the answer — never from the model itself.                                                                                                                                                                                        |
| **🔎 Drill into any exhibit**         | Every cited commit, PR, issue or review is a doorway: click **Investigate** to open a fresh, equally-grounded case anchored on that artifact — pulling in the discussion (review threads, issue comments, linked PRs) the line trail never surfaced. The child case links back to its parent and shows the origin question it was drilled from. |
| **🌐 No clone required**              | GitHub repos are read straight from the API (line-level blame + PR/issue/review enrichment in one graph query); local paths use `git` on disk.                                                                                                                                                                                                  |
| **🔐 Sign in & pick up later**        | Sign in with GitHub to investigate private repos with your own token and to keep a persistent case file — every investigation is saved to Postgres and restored across sessions and devices.                                                                                                                                                    |

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
</p>

| Category        | Technologies                                                                                       |
| --------------- | -------------------------------------------------------------------------------------------------- |
| **Framework**   | Next.js 16 (App Router), React 19                                                                  |
| **Language**    | TypeScript 5                                                                                       |
| **Styling**     | Tailwind CSS v4                                                                                    |
| **AI**          | Vercel AI SDK (`ai`) + `@ai-sdk/groq` — `generateObject` on a Zod schema                           |
| **Model**       | Groq inference, default `openai/gpt-oss-120b` (override via `GROQ_MODEL`)                          |
| **Evidence**    | GitHub GraphQL blame + REST enrichment, or local `git log -L` / blame                              |
| **Validation**  | Zod 4 (structured LLM output + input parsing)                                                      |
| **Auth**        | GitHub OAuth (`read:user`), HMAC-signed session cookie — no auth library                           |
| **Persistence** | PostgreSQL via Prisma 6 — saved investigations scoped per user                                     |
| **Runtime**     | Node.js API routes — `/api/dig`, `/api/repo`, `/api/file(s)`, `/api/auth/*`, `/api/investigations` |
| **Tooling**     | ESLint, Prettier (+ Tailwind plugin), Vitest, tsx                                                  |

<br/>

## 📝 Project Description

Git Investigator answers the question `git blame` can't: **why** is this line the way it is?

You paste a GitHub repo (or a local path), find a file, and click the line you're curious about. The app blames that line down to the commits that touched it, then follows the trail outward — the pull requests those commits belonged to, the issues those PRs closed, the reviews left on them — assembling a single, chronological body of evidence.

It then asks a language model to reconstruct the reasoning **using only that evidence**, and — crucially — it doesn't take the model's word for it. Every citation is checked against the real artifacts before anything is shown. If the model cites something that doesn't exist, it's caught. If the evidence simply doesn't explain the line, the answer is marked _inconclusive_ rather than dressed up as fact.

The result is presented as a **case file**: a verdict and prose answer, a confidence score, a **provenance chain** tracing the causal path — issue → PR → review → commit — and marking where it breaks, a timeline of the artifacts oldest-to-newest, evidence cards labelled as _cited_ or _supporting_, and a grounding sidebar showing exactly what backs the conclusion.

**Additional features:**

- **Two ways to collect, zero setup for public repos:** GitHub repos are read entirely through the API — line-level blame via GraphQL, then PRs, issues and reviews enriched per commit — so nothing is cloned. Local paths use `git` directly; remote repos that must be read on disk fall back to a shallow `--single-branch` clone (depth configurable via `CLONE_DEPTH`).
- **Drill-down that stays grounded:** Any exhibit in a case is a launchpad for the next one. Clicking **Investigate** on a commit / PR / issue / review runs the _same_ collect → synthesize → verify pipeline, but anchored on that artifact instead of a line — gathering the artifact's own body plus the immediate discussion the line trail skips (review-comment threads, issue comments, a PR's commits, linked PRs). So a follow-up is as grounded and abstention-honest as the first question, never a free-associating chatbot. The button previews the exact question it will ask, and the resulting case threads back to its parent with the origin question it descends from.
- **Fabrication-proof citations:** The verification step ([`src/lib/verify.ts`](src/lib/verify.ts)) is pure and deterministic — it intersects the model's citations with the set of real artifact ids and surfaces any it invented. The LLM never gets to vouch for its own sources.
- **Confidence you can audit:** The score is a function of concrete signals only — is the answer grounded, did the history actually record a reason, and how many primary sources corroborate it — mapping to `high` / `medium` / `low` with the source counts shown in the UI.
- **Graceful without a key:** With no `GROQ_API_KEY` set, the app still collects and displays all the evidence — it just skips the synthesized answer instead of failing.
- **Sign in with GitHub:** Optional OAuth (`read:user`) that unlocks private repos — the session carries your own token into the blame query — and gives each user their own persistent case file. The session is a plain HMAC-signed cookie; there's no auth framework in the stack.
- **Case history that persists:** Each investigation is saved in a left rail with its question and status (Resolved / Inconclusive / Evidence only). Signed in with a database configured, cases are written to Postgres (via Prisma, scoped per user) and restored on any device; without either, the rail stays in memory for the session.
- **A terminal companion:** `npm run dig` runs the same collect → synthesize → verify pipeline from the CLI, with `--why`, `--dry-run` (prints the exact prompt without calling the model) and `--json` flags.

<br/>

## 🔬 How it works

The pipeline is three distinct stages, and only the middle one touches an LLM — the collection is deterministic and the verification is deterministic, which is what makes the output trustworthy:

```
line → blame (GitHub GraphQL / local git)
     → enrich: commits → PRs → issues → reviews   [deterministic]
     → synthesize the "why" from evidence only     [LLM · generateObject]
     → verify every citation against real ids       [deterministic]
     → score confidence from real signals only      [deterministic]
     → case file (verdict · provenance chain · evidence · timeline)
```

**Collect ([`src/lib/collect`](src/lib/collect)).** A location is blamed to the commits that shaped it. On GitHub, a single GraphQL blame query returns the commit ranges, and each commit is enriched with its associated PR, that PR's reviews, and the issues it closed. Every commit, PR, issue and review becomes an `Artifact` with a stable id (`commit:sha`, `pr:812`, `issue:1187`, …), deduplicated and sorted oldest-first. The same stage can also be **anchored on an artifact instead of a line** (the drill-down): given a PR, issue or commit, [`collect/github/context.ts`](src/lib/collect/github/context.ts) gathers that artifact's body plus its immediate discussion — review-comment threads, issue comments, a PR's commits, cross-referenced PRs — folded into the same `Artifact` list, so synthesis and verification treat it identically.

**Synthesize ([`src/lib/synthesize.ts`](src/lib/synthesize.ts)).** The evidence is rendered as an id-tagged list and handed to the model with a strict system prompt: explain the _why_ using **only** the evidence, back every claim with an exact artifact id, and if the evidence doesn't explain it, set `recorded: false` and admit it. Output is forced through a Zod schema — `{ answer, citations, recorded }` — so it's structured, not scraped from prose.

**Verify ([`src/lib/verify.ts`](src/lib/verify.ts)).** No model involved. The narrative's citations are intersected with the real artifact ids; anything left over is a fabrication and the answer is marked ungrounded. Confidence is then computed purely from signals that can't be faked:

| Condition                          | Score | Level  |
| ---------------------------------- | ----- | ------ |
| Fabricated citation (not grounded) | 0.20  | low    |
| `recorded: false` (history silent) | 0.30  | low    |
| Grounded, 0 primary sources        | 0.35  | low    |
| Grounded, 1 primary source         | 0.65  | medium |
| Grounded, 2+ primary sources       | 0.90  | high   |

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
- **Grounding checks existence, not entailment.** Verification proves every cited artifact is real and was collected — it catches fabricated references. It does _not_ yet check that the artifact's content actually supports the claim it's cited for, so a real source attributed to the wrong reason would still pass. Semantic entailment is the natural next layer.
- **Big investigations trim the prompt.** The synthesis model is rate-limited by tokens per minute, so on large cases the evidence _bodies_ sent to the model are budget-trimmed — every artifact id is always kept, so citations and grounding stay intact, and the full bodies remain visible in the evidence cards.

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

> Configure it — copy `.env.on-prem.example` to `.env.on-prem` and set at least a GitLab **access token** (`read_api` + `read_repository`) and your **host**:

```bash
cp .env.on-prem.example .env.on-prem
# GITLAB_TOKEN=glpat-...
# GITLAB_HOSTS=gitlab.company.com
```

> Build and start the container (must run where it can reach your GitLab host):

```bash
docker compose --env-file .env.on-prem up -d --build
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
