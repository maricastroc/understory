import { generateObject } from "ai";
import { z } from "zod";
import { type Auditor, runAudit } from "./auditor";
import { canonicalCitations } from "./citation-id";
import { renderCode } from "./collect/code-context";
import type { Model } from "./llm";
import { owningCommit } from "./provenance";
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

const quotes = z
  .array(z.string())
  .describe(
    "For 'supported': the passage, or the few passages, that prove the claim. Each item is ONE continuous stretch copied from one source, character for character: never paraphrased, never two passages joined in one item, never shortened with '...'. Empty otherwise.",
  );

const claimSchema = z.object({
  status: z
    .enum(["supported", "unproven", "unrelated"])
    .describe(
      "supported = the sources state or clearly imply everything in the claim that needs proof, relationships included (quote required); unproven = the sources are about the claim's subject but leave part of it unstated: a detail, a cause, a consequence or a link the claim adds; unrelated = the sources are about something else, or say the opposite of the claim.",
    ),
  quotes,
  reason: z
    .string()
    .describe("One short line: why the sources do or do not substantiate the claim."),
});

const sitedSchema = z.object({
  code: z
    .enum(["nothing", "agrees", "contradicts"])
    .describe(
      "PART 1, against the lines of code and the change shown under 'Established' and nothing else. nothing = the claim says nothing they could settle. agrees = what it says about them is what they show. contradicts = they show the opposite of what it says; never for an earlier version of the code or for code outside the lines shown.",
    ),
  record: z
    .enum(["nothing", "supported", "unproven", "unrelated"])
    .describe(
      "PART 2, against the sources and nothing else: whatever the claim says beyond what the lines shown and the stated change show. nothing = it says nothing beyond them. supported = the sources state or clearly imply all the rest (quotes required). unproven = the sources are about the subject but leave part of the rest unstated. unrelated = the sources are about something else, or say the opposite.",
    ),
  quotes,
  reason: z
    .string()
    .describe(
      "One short line: what the check against the code and the check against the sources found.",
    ),
});

type Sited = z.infer<typeof sitedSchema>;

const STATUS: Record<z.infer<typeof claimSchema>["status"], EntailmentStatus> = {
  supported: "supported",
  unproven: "weak",
  unrelated: "unsupported",
};

export type RawVerdict = {
  status: EntailmentStatus;
  quotes: string[];
  reason: string;
  code?: Sited["code"];
  record?: Sited["record"];
  earlier?: boolean;
};

export function sitedStatus(code: Sited["code"], record: Sited["record"]): EntailmentStatus {
  if (code === "contradicts" || record === "unrelated") return "unsupported";
  return record === "supported" ? "supported" : "weak";
}

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

const SITED_SYSTEM = [
  "You are a citation auditor. An answer about the history of a piece of code makes ONE claim and",
  "cites the source(s) shown. Under 'Established' you are also shown a few lines of that code as it",
  "is today, with the line under investigation marked, and, when it is known, what the last change",
  "did to that line. Check the claim in TWO separate parts, each against its own record. Never",
  "outside knowledge, never what merely seems plausible.",
  "",
  "PART 1, `code`: what the claim says that the lines shown or the stated change can settle. That",
  "the marked line is a comment, that it returns a value, that it sits in a method, that a commit",
  "added it, what it read before the last change. Check this ONLY against 'Established'. The",
  "sources do not have to say any of it: do not look for it there, and do not hold it against the",
  "claim that a commit message is silent about a line, a name, a value or a rewrite.",
  "Saying what the marked line is FOR is saying what it does: 'the line was added to validate the",
  "input' says that the line validates the input, so check that against the line. 'The line came",
  "with the change that validates the input' says only which change brought it.",
  "- nothing: the claim says nothing that the lines shown or the stated change could settle.",
  "- agrees: what it says about them is what they show.",
  "- contradicts: they show the OPPOSITE of what it says. The marked line is said to 'validate the",
  "  input' and it is a closing brace. It is said to have been 'rewritten to use a cache' and",
  "  neither its old nor its new text mentions one. It is said to have been 'removed' or",
  "  'rewritten' and the change added it. Answer contradicts only when you can name the line or the",
  "  change that shows the opposite, and name it in `reason`.",
  "Not showing something is NOT contradicting it. Only a few lines are shown, and only as they are",
  "today. They cannot contradict what the claim says about an earlier version of the code ('at",
  "first every response was cached'), about a change before the last one, or about code outside the",
  "lines shown ('with a timeout', when no line shown sets one). All of that is history: it belongs",
  "to PART 2, and only the sources can settle it.",
  "",
  "PART 2, `record`: everything else the claim says, which only the record can know: what the",
  "change was for, what it introduced or fixed, why it was made, what problem it answered, how the",
  "code was before or elsewhere, what was decided or said, and any RELATIONSHIP between those facts",
  "('X was added because of Y', 'A fixed B'). Check this ONLY against the sources, from their text",
  "alone. Leave out what PART 1 settled: the sources do not have to repeat a name, a value or a",
  "statement that the code shown already agrees with. The code never proves a reason, and a reason",
  "does not become proven because the code is described correctly. A relationship is proven only if",
  "the sources establish it: that Y motivated X, not merely that X and Y each happened. When",
  "several sources are shown, judge whether they TOGETHER establish it.",
  "- nothing: the claim says nothing beyond what the lines shown and the stated change show.",
  "- supported: the sources state or clearly imply all the rest of the claim. You MUST copy the",
  "  proof from the sources into `quotes`.",
  "- unproven: the sources are about the subject, but part of the rest is not in them: a detail, a",
  "  cause, a consequence or a link the claim adds. A source that covers the subject and is silent",
  "  on the claim's point is unproven, not unrelated. Never unproven only because the sources do",
  "  not repeat something the code shown agrees with.",
  "- unrelated: the sources are about something else, or they say the opposite of the claim.",
  "When you hesitate between two verdicts for `record`, answer unproven.",
  "",
  "A claim that mixes both kinds is checked on both: what it says of the code shown in PART 1, the",
  "rest in PART 2. Neither part excuses the other.",
  "",
  "`quotes` holds the proof for PART 2: the passage, or the few passages, where the sources state",
  "it. Each item must be ONE continuous stretch copied EXACTLY from one source, character for",
  "character, never from the code. Put separate passages in separate items: never join two in one",
  "item, never shorten with '...', never paraphrase, never correct a typo, never invent. If you",
  "cannot find a real passage, leave `quotes` empty and do NOT answer 'supported'. Keep `reason` to",
  "one short line.",
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
  code?: "agrees" | "contradicts";
};

const CONTRADICTED = "the code shown contradicts the claim";
const EARLIER =
  "the claim cites only changes made before the one shown, so the code shown is not held against it";
const ONLY_THE_CODE =
  "the claim says only what the code and the change show, which no source has to back";

const withNote = (reason: string, note: string): string => (reason ? `${reason} (${note})` : note);

function inSources(sources: Artifact[], offered: string): SourcedQuote[] | null {
  for (const s of sources) {
    const passages = sourcePassages(s.body, offered);
    if (passages) return passages.map((text) => ({ sourceId: s.id, text }));
  }
  return null;
}

export function finalizeClaim(sources: Artifact[], raw: RawVerdict): ClaimVerdict {
  const setAside = raw.earlier && raw.code === "contradicts";
  const code = raw.code && raw.code !== "nothing" && !setAside ? { code: raw.code } : {};
  const said = setAside ? withNote(raw.reason, EARLIER) : raw.reason;
  if (raw.code === "contradicts" && !setAside)
    return {
      status: "unsupported",
      quotes: [],
      rejectedQuotes: [],
      reason: withNote(raw.reason, CONTRADICTED),
      ...code,
    };
  if (raw.status === "unsupported")
    return { status: "unsupported", quotes: [], rejectedQuotes: [], reason: said, ...code };
  const quotes: SourcedQuote[] = [];
  const rejectedQuotes: string[] = [];
  for (const offered of raw.quotes.map((q) => q.trim()).filter(Boolean)) {
    const found = inSources(sources, offered);
    if (found) quotes.push(...found);
    else rejectedQuotes.push(offered);
  }
  if (raw.status === "supported" && quotes.length === 0)
    return {
      status: "weak",
      quotes,
      rejectedQuotes,
      reason: withUnverifiedNote(said),
      ...code,
    };
  const reason =
    raw.record === "nothing" && raw.code === "agrees" ? withNote(said, ONLY_THE_CODE) : said;
  return { status: raw.status, quotes, rejectedQuotes, reason, ...code };
}

export type AuditSubject = {
  established: string;
  exact: boolean;
  sited: boolean;
  shown: string[];
};

function changeShown(ev: Evidence): string[] {
  const owner = owningCommit(ev);
  if (!owner) return [];
  const within = new Set([owner.id]);
  let size = 0;
  while (within.size > size) {
    size = within.size;
    for (const a of ev.artifacts) if (a.parentId && within.has(a.parentId)) within.add(a.id);
  }
  return [...within];
}

export function auditSubject(ev: Evidence): AuditSubject | null {
  if (!ev.location) return null;
  const where = formatTarget(ev);
  if (ev.coverage?.granularity === "file")
    return {
      exact: false,
      sited: false,
      shown: [],
      established: [
        `The code under investigation is ${where}. Its line history could not be read, so the sources`,
        `shown come from the history of the whole file ${ev.location.file}: its commits and the pull`,
        "requests, reviews and issues attached to them. That they changed the file is given. That they",
        "changed this exact code is not.",
      ].join("\n"),
    };
  return {
    exact: true,
    sited: Boolean(ev.code),
    shown: ev.code ? changeShown(ev) : [],
    established: [
      `The code under investigation is ${where}. The sources shown come from that code's own history:`,
      "the commits that changed it and the pull requests, reviews and issues attached to them. That a",
      "cited commit or pull request changed this code is given.",
      ...(ev.code ? ["", renderCode(ev.code, ev.location)] : []),
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

  const call = { model, prompt, temperature: 0, maxOutputTokens: JUDGE_MAX_OUTPUT_TOKENS };
  if (subject?.sited) {
    const { object } = await generateObject({ ...call, schema: sitedSchema, system: SITED_SYSTEM });
    const earlier = !sources.some((a) => subject.shown.includes(a.id));
    return {
      ...object,
      status: sitedStatus(earlier ? "nothing" : object.code, object.record),
      ...(earlier ? { earlier } : {}),
    };
  }
  const { object } = await generateObject({ ...call, schema: claimSchema, system: CLAIM_SYSTEM });
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
        ...(verdict.code ? { code: verdict.code } : {}),
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
