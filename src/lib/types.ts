/**
 * The vocabulary of Git Investigator.
 *
 * Everything the product does moves one shape through five stages:
 *
 *   [1 Anchor]      what are we asking?      -> Question + CodeLocation + RepoRef
 *   [2 Collect]     git/github -> artifacts  -> Artifact[]
 *   [3 Evidence]    organise what we found   -> Evidence
 *   [4 Synthesize]  evidence -> narrative     -> Narrative        (LLM, later)
 *   [5 Verify]      are the citations real?   -> VerifiedNarrative (deterministic, later)
 *
 * Stages [1]-[3] are built now (git only). Stages [4]-[5] are declared here so
 * the whole pipeline shares one vocabulary — they land in later steps.
 *
 * These types back the case-file UI: an Artifact is an "Exhibit", the ordered
 * artifacts are the "Timeline", the Narrative is "Findings", and Confidence +
 * grounding are the "Chain of provenance".
 */

/** A person behind an artifact (commit author, PR reviewer, issue reporter). */
export type Person = {
  name: string;
  email?: string;
};

/** The kinds of history we can dig up. Only "commit" is wired in step 1. */
export type ArtifactKind = "commit" | "pull_request" | "issue" | "review";

/**
 * One piece of unearthed history. Everything we collect becomes an Artifact,
 * and every Artifact has a stable `id` that a conclusion can *cite*.
 */
export type Artifact = {
  /** Citable handle, e.g. "commit:c038fb3" or "pr:812". */
  id: string;
  kind: ArtifactKind;
  /** Short label for display (commit subject, PR title, issue title...). */
  title: string;
  /** The full text the LLM will actually read (e.g. the whole commit message). */
  body: string;
  /** Link back to the source. "" when the repo has no known web remote. */
  url: string;
  /** ISO 8601 timestamp — used to order the timeline. */
  date: string;
  author?: Person;
  /** Human-facing reference: short SHA, "#812", "INC-1187". */
  ref?: string;
  /** Kind-specific extras (full SHA, diff stats, PR state, ...). */
  meta?: Record<string, string | number>;
};

/** Where in the code the investigation is pointed. Lines are 1-based, inclusive. */
export type CodeLocation = {
  /** Repo-relative path, e.g. "src/billing/charge.ts". */
  file: string;
  startLine: number;
  endLine: number;
};

/** The repository under investigation. */
export type RepoRef = {
  /** Local filesystem path to the clone we read. */
  path: string;
  /** "owner/name" when derivable from the remote. */
  name?: string;
  /** Web base for building artifact URLs, e.g. https://github.com/acme/payments-service. */
  remoteUrl?: string;
  branch?: string;
};

/**
 * [3] Everything we gathered for ONE question, plus what was asked.
 * `artifacts` is ordered oldest-first, so it doubles as the timeline.
 */
export type Evidence = {
  question: string;
  repo: RepoRef;
  location: CodeLocation;
  artifacts: Artifact[];
};

// ---------------------------------------------------------------------------
// Forward vocabulary — declared now, produced in later steps.
// ---------------------------------------------------------------------------

/**
 * [4] What the LLM returns. `recorded` is the honest-abstention flag: false
 * means "the history does not actually explain this". Not yet produced.
 */
export type Narrative = {
  answer: string;
  /** Artifact ids the model claims to rely on, e.g. ["commit:c038fb3"]. */
  citations: string[];
  recorded: boolean;
};

/** How much we trust the reconstructed rationale — the confidence indicator. */
export type Confidence = {
  /** 0..1. */
  score: number;
  level: "high" | "medium" | "low";
  primarySources: number;
  corroborating: number;
  contradicting: number;
};

/**
 * [5] A narrative after verify.ts has *checked* (not trusted) its citations.
 * This is the difference between a toy that hallucinates and a tool you trust.
 */
export type VerifiedNarrative = Narrative & {
  /** True only if every citation resolves to a collected artifact. */
  grounded: boolean;
  /** Cited ids we never actually collected = hallucination. */
  unknownCitations: string[];
  confidence: Confidence;
};

/** The full result of one investigation — what POST /api/dig returns. */
export type DigResult = {
  evidence: Evidence;
  /** null when synthesis was skipped (no API key) or failed; see `error`. */
  narrative: VerifiedNarrative | null;
  error?: string;
};
