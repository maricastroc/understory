import { generateObject } from "ai";
import { z } from "zod";
import { type Auditor, runAudit } from "./auditor";
import { canonicalCitations } from "./citation-id";
import type { Model } from "./llm";
import { sourcePassages } from "./quote";
import { formatTarget } from "./synthesize";
import type {
  Artifact,
  CitationCheck,
  Claim,
  Entailment,
  EntailmentStatus,
  Evidence,
  Narrative,
} from "./types";

const MAX_CHECKS = 6;
const JUDGE_BODY_CAP = 1_600;
const JUDGE_MAX_OUTPUT_TOKENS = 2_000;

const EMPTY: Entailment = { checked: false, checks: [], supported: 0, misattributed: 0 };

const UNVERIFIED_QUOTE = "the cited quote was not found in the source";

const withUnverifiedNote = (reason: string): string =>
  reason ? `${reason} (${UNVERIFIED_QUOTE})` : UNVERIFIED_QUOTE;

const claimSchema = z.object({
  status: z
    .enum(["supported", "unproven", "unrelated"])
    .describe(
      "supported = the sources state or clearly imply everything in the claim that needs proof, relationships included (quote required); unproven = the sources are about the claim's subject but leave part of it unstated: a detail, a cause, a consequence or a link the claim adds; unrelated = the sources are about something else, or say the opposite of the claim.",
    ),
  quotes: z
    .array(z.string())
    .describe(
      "For 'supported': the passage, or the few passages, that prove the claim. Each item is ONE continuous stretch copied from one source, character for character: never paraphrased, never two passages joined in one item, never shortened with '...'. Empty otherwise.",
    ),
  reason: z
    .string()
    .describe("One short line: why the sources do or do not substantiate the claim."),
});

const STATUS: Record<z.infer<typeof claimSchema>["status"], EntailmentStatus> = {
  supported: "supported",
  unproven: "weak",
  unrelated: "unsupported",
};

export type RawVerdict = { status: EntailmentStatus; quotes: string[]; reason: string };

const CLAIM_SYSTEM = [
  "You are a citation auditor. An answer about the history of a piece of code makes ONE claim and",
  "cites the source(s) shown. Decide whether those sources substantiate the claim, from their text",
  "alone: never outside knowledge, never what merely seems plausible.",
  "",
  "WHAT IS GIVEN. When the request has an 'Established' section, what it states comes from the",
  "repository's own history and is not under review, and neither is what each source's heading says",
  "the source is. If a heading says a commit or pull request changed the code under investigation,",
  "then 'the line was added, introduced or changed in' that commit or pull request is a fact, not a",
  "claim to check. The claim may call that code 'the line', 'this code', or name it by file and line",
  "number. Do NOT expect a source to mention the line, the file or a line number, and do NOT mark a",
  "claim down because the sources do not.",
  "",
  "WHAT NEEDS PROOF. Everything else the claim asserts: what the change did, why it was made, what",
  "problem it answered, what was decided or said, and any RELATIONSHIP between those facts ('X was",
  "added because of Y', 'A fixed B', 'this replaced Z'). A relationship is proven only if the",
  "sources establish it: that Y motivated X, not merely that X and Y each happened. Two true facts",
  "do not prove a link between them. When several sources are shown, judge whether they TOGETHER",
  "establish the claim.",
  "",
  "- supported: the sources state or clearly imply everything in the claim that needs proof.",
  "  You MUST copy the proof from the sources into `quotes`.",
  "- unproven: the sources are about the claim's subject, but part of what needs proof is not in",
  "  them: a detail, a cause, a consequence or a link the claim adds. A source that covers the",
  "  subject and is silent on the claim's point is unproven, not unrelated.",
  "- unrelated: the sources are about something else, or they say the opposite of the claim.",
  "",
  "When you hesitate between two verdicts, answer unproven.",
  "",
  "`quotes` holds the proof: the passage, or the few passages, where the sources state what the",
  "claim asserts. Each item must be ONE continuous stretch copied EXACTLY from one source, character",
  "for character. Put separate passages in separate items: never join two in one item, never",
  "shorten with '...', never paraphrase, never correct a typo, never invent. If you cannot find a",
  "real passage that proves the claim, leave `quotes` empty and do NOT answer 'supported'. Keep",
  "`reason` to one short line.",
].join("\n");

function clampBody(body: string, cap: number): string {
  if (body.length <= cap) return body;
  return `${body.slice(0, cap).trimEnd()}… [truncated]`;
}

export type SourcedQuote = { sourceId: string; text: string };

export type ClaimVerdict = {
  status: EntailmentStatus;
  quotes: SourcedQuote[];
  rejectedQuotes: string[];
  reason: string;
};

function inSources(sources: Artifact[], offered: string): SourcedQuote[] | null {
  for (const s of sources) {
    const passages = sourcePassages(s.body, offered);
    if (passages) return passages.map((text) => ({ sourceId: s.id, text }));
  }
  return null;
}

export function finalizeClaim(sources: Artifact[], raw: RawVerdict): ClaimVerdict {
  if (raw.status === "unsupported")
    return { status: "unsupported", quotes: [], rejectedQuotes: [], reason: raw.reason };
  const quotes: SourcedQuote[] = [];
  const rejectedQuotes: string[] = [];
  for (const offered of raw.quotes.map((q) => q.trim()).filter(Boolean)) {
    const found = inSources(sources, offered);
    if (found) quotes.push(...found);
    else rejectedQuotes.push(offered);
  }
  if (raw.status === "supported" && quotes.length === 0)
    return { status: "weak", quotes, rejectedQuotes, reason: withUnverifiedNote(raw.reason) };
  return { status: raw.status, quotes, rejectedQuotes, reason: raw.reason };
}

export type AuditSubject = { established: string; exact: boolean };

export function auditSubject(ev: Evidence): AuditSubject | null {
  if (!ev.location) return null;
  const where = formatTarget(ev);
  if (ev.coverage?.granularity === "file")
    return {
      exact: false,
      established: [
        `The code under investigation is ${where}. Its line history could not be read, so the sources`,
        `shown come from the history of the whole file ${ev.location.file}: its commits and the pull`,
        "requests, reviews and issues attached to them. That they changed the file is given. That they",
        "changed this exact code is not.",
      ].join("\n"),
    };
  return {
    exact: true,
    established: [
      `The code under investigation is ${where}. The sources shown come from that code's own history:`,
      "the commits that changed it and the pull requests, reviews and issues attached to them. That a",
      "cited commit or pull request changed this code is given.",
    ].join("\n"),
  };
}

function standing(a: Artifact, subject: AuditSubject): string {
  const target = subject.exact ? "the code under investigation" : "the file under investigation";
  if (a.kind === "commit") return `a commit that changed ${target}`;
  if (a.kind === "pull_request")
    return a.parentId
      ? `the pull request that merged ${a.parentId}, so it changed ${target} too`
      : "a pull request";
  if (a.kind === "issue") return a.parentId ? `an issue linked to ${a.parentId}` : "an issue";
  return a.parentId ? `a review comment on ${a.parentId}` : "a review comment";
}

export async function judgeClaim(
  question: string,
  claimText: string,
  sources: Artifact[],
  model: Model,
  subject: AuditSubject | null = null,
): Promise<RawVerdict> {
  const rendered = sources
    .map((a) => {
      const who = a.author?.name ? ` · ${a.author.name}` : "";
      const what = subject ? ` · ${standing(a, subject)}` : "";
      return `[${a.id}] ${a.kind} · ${a.date.slice(0, 10)}${who}${what}:\n${clampBody(a.body, JUDGE_BODY_CAP)}`;
    })
    .join("\n\n---\n\n");
  const lead =
    sources.length > 1
      ? `The claim cites ${sources.length} sources — judge whether they TOGETHER substantiate it:`
      : "Source being audited:";
  const prompt = [
    `Question: ${question}`,
    "",
    ...(subject
      ? ["Established by the repository's history, not under review:", subject.established, ""]
      : []),
    "Claim under review:",
    claimText,
    "",
    lead,
    rendered,
  ].join("\n");

  const { object } = await generateObject({
    model,
    schema: claimSchema,
    system: CLAIM_SYSTEM,
    prompt,
    temperature: 0,
    maxOutputTokens: JUDGE_MAX_OUTPUT_TOKENS,
  });
  return { ...object, status: STATUS[object.status] };
}

export async function auditClaim(
  question: string,
  claimText: string,
  sources: Artifact[],
  auditor: Auditor,
  subject: AuditSubject | null = null,
): Promise<{ raw: RawVerdict; verdict: ClaimVerdict; fellBack: boolean }> {
  const { value, fellBack } = await runAudit(auditor, (model) =>
    judgeClaim(question, claimText, sources, model, subject),
  );
  return { raw: value, verdict: finalizeClaim(sources, value), fellBack };
}

type ClaimTask = { index: number; text: string; sources: Artifact[] };

export async function entailClaims(
  question: string,
  claims: Claim[],
  byId: Map<string, Artifact>,
  auditor: Auditor,
  subject: AuditSubject | null = null,
): Promise<Entailment> {
  const known = new Set(byId.keys());
  const tasks: ClaimTask[] = claims
    .map((c, index) => ({
      index,
      text: c.text,
      sources: Array.from(new Set(canonicalCitations(c.citations, known)))
        .map((id) => byId.get(id))
        .filter((a): a is Artifact => Boolean(a)),
    }))
    .filter((t) => t.sources.length > 0)
    .slice(0, MAX_CHECKS);
  if (tasks.length === 0) return EMPTY;

  const settled = await Promise.allSettled(
    tasks.map((t) =>
      auditClaim(question, t.text, t.sources, auditor, subject).then((judged) => ({
        t,
        ...judged,
      })),
    ),
  );

  const checks: CitationCheck[] = [];
  let supported = 0;
  let misattributed = 0;
  let failed = 0;
  let fallbacks = 0;
  for (const s of settled) {
    if (s.status !== "fulfilled") {
      failed++;
      continue;
    }
    const { t, verdict, fellBack } = s.value;
    if (fellBack) fallbacks++;
    if (verdict.status === "supported") supported++;
    else if (verdict.status === "unsupported") misattributed++;
    for (const src of t.sources) {
      checks.push({
        citation: src.id,
        claim: t.index,
        status: verdict.status,
        quote: verdict.quotes.find((q) => q.sourceId === src.id)?.text ?? null,
        ...(verdict.rejectedQuotes.length ? { rejectedQuotes: verdict.rejectedQuotes } : {}),
        reason: verdict.reason,
      });
    }
  }
  if (checks.length === 0) return { ...EMPTY, failed, fallbacks };

  return { checked: true, checks, supported, misattributed, failed, fallbacks };
}

export async function checkEntailment(
  ev: Evidence,
  n: Narrative,
  auditor: Auditor,
): Promise<Entailment> {
  if (!n.answerable || !n.recorded) return EMPTY;
  return entailClaims(
    ev.question,
    n.claims,
    new Map(ev.artifacts.map((a) => [a.id, a])),
    auditor,
    auditSubject(ev),
  );
}
