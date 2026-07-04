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

|                              |                                                                                                                                                           |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **🔗 Verifiable why**        | Every sentence in the answer is backed by a real artifact — a commit, PR, issue or review — cited by exact id and linked so you can open the source.      |
| **🤐 Honest abstention**     | When the history genuinely doesn't explain a line, it says so (`recorded: false`) and scores low, instead of inventing a motivation. Silence is a result. |
| **✅ Grounding check**       | A deterministic pass compares every citation against the collected evidence. Any id the model made up is flagged as a fabrication — no LLM in the loop.   |
| **📊 Confidence, not vibes** | A 0–100 score derived only from real signals — grounding, abstention, and how many primary sources corroborate the answer — never from the model itself.  |
| **🌐 No clone required**     | GitHub repos are read straight from the API (line-level blame + PR/issue/review enrichment in one graph query); local paths use `git` on disk.            |

<br/>

## 🛠️ Tech Stack

<p>
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Groq-F55036?style=for-the-badge&logo=groq&logoColor=white" alt="Groq" />
  <img src="https://img.shields.io/badge/Zod-3E67B1?style=for-the-badge&logo=zod&logoColor=white" alt="Zod" />
  <img src="https://img.shields.io/badge/GitHub_API-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub API" />
</p>

| Category       | Technologies                                                              |
| -------------- | ------------------------------------------------------------------------- |
| **Framework**  | Next.js 16 (App Router), React 19                                         |
| **Language**   | TypeScript 5                                                              |
| **Styling**    | Tailwind CSS v4                                                           |
| **AI**         | Vercel AI SDK (`ai`) + `@ai-sdk/groq` — `generateObject` on a Zod schema  |
| **Model**      | Groq inference, default `openai/gpt-oss-120b` (override via `GROQ_MODEL`) |
| **Evidence**   | GitHub GraphQL blame + REST enrichment, or local `git log -L` / blame     |
| **Validation** | Zod 4 (structured LLM output + input parsing)                             |
| **Runtime**    | Node.js API routes (`/api/dig`, `/api/repo`, `/api/file`, `/api/files`)   |
| **Tooling**    | ESLint, Prettier (+ Tailwind plugin), tsx                                 |

<br/>

## 📝 Project Description

Git Investigator answers the question `git blame` can't: **why** is this line the way it is?

You paste a GitHub repo (or a local path), find a file, and click the line you're curious about. The app blames that line down to the commits that touched it, then follows the trail outward — the pull requests those commits belonged to, the issues those PRs closed, the reviews left on them — assembling a single, chronological body of evidence.

It then asks a language model to reconstruct the reasoning **using only that evidence**, and — crucially — it doesn't take the model's word for it. Every citation is checked against the real artifacts before anything is shown. If the model cites something that doesn't exist, it's caught. If the evidence simply doesn't explain the line, the answer is marked _inconclusive_ rather than dressed up as fact.

The result is presented as a **case file**: a verdict and prose answer, a confidence score, a timeline of the artifacts oldest-to-newest, evidence cards labelled as _cited_ or _supporting_, and a chain-of-provenance sidebar showing exactly what backs the conclusion.

**Additional features:**

- **Two ways to collect, zero setup for public repos:** GitHub repos are read entirely through the API — line-level blame via GraphQL, then PRs, issues and reviews enriched per commit — so nothing is cloned. Local paths use `git` directly; remote repos that must be read on disk fall back to a shallow `--single-branch` clone (depth configurable via `CLONE_DEPTH`).
- **Fabrication-proof citations:** The verification step ([`src/lib/verify.ts`](src/lib/verify.ts)) is pure and deterministic — it intersects the model's citations with the set of real artifact ids and surfaces any it invented. The LLM never gets to vouch for its own sources.
- **Confidence you can audit:** The score is a function of concrete signals only — is the answer grounded, did the history actually record a reason, and how many primary sources corroborate it — mapping to `high` / `medium` / `low` with the source counts shown in the UI.
- **Graceful without a key:** With no `GROQ_API_KEY` set, the app still collects and displays all the evidence — it just skips the synthesized answer instead of failing.
- **Case history:** Each investigation is saved in a left rail with its question and status (Resolved / Inconclusive / Evidence only), so you can jump back to any prior case.
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
     → case file (verdict · timeline · evidence · provenance)
```

**Collect ([`src/lib/collect`](src/lib/collect)).** A location is blamed to the commits that shaped it. On GitHub, a single GraphQL blame query returns the commit ranges, and each commit is enriched with its associated PR, that PR's reviews, and the issues it closed. Every commit, PR, issue and review becomes an `Artifact` with a stable id (`commit:sha`, `pr:812`, `issue:1187`, …), deduplicated and sorted oldest-first.

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

## 📌 What did I learn?

The hard part was resisting the obvious shape of an "AI explains your code" tool — one prompt, one plausible paragraph, ship it. Plausible isn't the same as true, and for _why_ questions the failure mode is subtle: a confident, well-written answer citing a commit that doesn't exist. So the design puts the LLM in a box between two deterministic layers — collection it can't add to, and verification it can't influence — and treats "the history doesn't say" as a first-class, correct answer rather than a failure. Getting the confidence model to reflect real evidence (grounding, abstention, corroborating source count) instead of the model's own certainty is what makes the output something you can actually trust.

<br/>

## ℹ️ How to run the application?

> Clone the repository:

```bash
git clone https://github.com/maricastroc/git-archeologist
```

> Install the dependencies:

```bash
npm install
```

> Copy `.env.example` to `.env.local` and add your keys.
> A **Groq API key** (free, no card — [console.groq.com/keys](https://console.groq.com/keys)) enables the synthesized answer; a **GitHub token** is needed for line-level blame and private repos. The app still collects and shows evidence without either.

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

## 📄 License

Released under the MIT License. You're free to use, study, fork and build on this code — **as long as the original copyright and license notice are kept**. Reuse it and learn from it; don't strip the attribution and present it as your own.

© 2025–2026 Mariana Castro

<br/>

<div align="center">

⭐ If you like this project, give it a star on GitHub!

</div>
