import { verify } from "@understory/core/verify";
import type {
  Artifact,
  BlameSpan,
  DigResult,
  Entailment,
  Evidence,
  Narrative,
} from "@understory/core/types";
import type { Locale } from "@/i18n/locales";
import { messagesFor } from "@/i18n/messages";
import { buildInvestigationView } from "../../line-investigation/model/build-investigation-view";
import type { InvestigationView } from "../../line-investigation/model/types";
import type { LineVersion } from "./strata/types";

export const LANDING_NOW = Date.parse("2026-09-27T12:00:00.000Z");
export const LANDING_PATH = "src/billing/charge.ts";

const sha = (short: string) => short.padEnd(40, "0");

const artifacts: Artifact[] = [
  {
    id: "commit:7be210e",
    kind: "commit",
    title: "Add retry loop to charge",
    body: "Add retry loop to charge",
    url: "",
    date: "2021-06-18T14:02:00Z",
    author: { name: "Leo Park" },
    ref: "7be210e",
    meta: { sha: sha("7be210e"), prLookup: "none" },
  },
  {
    id: "issue:1187",
    kind: "issue",
    title: "Customers double-billed during Stripe outage",
    body: "Customers double-billed during Stripe outage\n\nStripe returned 504s and 212 customers were charged twice.",
    url: "",
    date: "2023-03-02T09:14:00Z",
    ref: "#1187",
    parentId: "pr:812",
    meta: { state: "CLOSED" },
  },
  {
    id: "pr:812",
    kind: "pull_request",
    title: "Bound retries in chargeCustomer",
    body: "Bound retries in chargeCustomer\n\nUnbounded retries double-charged customers during the Stripe incident (#1187). This caps attempts at 3 and adds exponential backoff.",
    url: "",
    date: "2023-03-09T10:00:00Z",
    ref: "#812",
    parentId: "commit:92f6a3f",
    meta: { mergedAt: "2023-03-15T16:20:00Z", reviewLookup: "found", issueLookup: "found" },
  },
  {
    id: "review:812-0",
    kind: "review",
    title: "Review by ana-l on #812",
    body: "LGTM once the cap comes down.",
    url: "",
    date: "2023-03-12T11:30:00Z",
    author: { name: "ana-l" },
    ref: "#812",
    parentId: "pr:812",
    meta: { state: "APPROVED" },
  },
  {
    id: "review:812-1",
    kind: "review",
    title: "Review by dmitri-k on #812",
    body: "5 attempts with backoff blows past the 10 s webhook window. 3 gives a 7 s worst case.",
    url: "",
    date: "2023-03-14T15:45:00Z",
    author: { name: "dmitri-k" },
    ref: "#812",
    parentId: "pr:812",
    meta: { state: "CHANGES_REQUESTED" },
  },
  {
    id: "commit:92f6a3f",
    kind: "commit",
    title: "Cap charge retries at 3, add backoff",
    body: "Cap charge retries at 3, add backoff\n\nBound retries to 3 attempts with 1s/2s/4s backoff. Fixes the double-charge path from #1187.",
    url: "",
    date: "2023-03-15T16:20:00Z",
    author: { name: "Priya Raman" },
    ref: "92f6a3f",
    meta: { sha: sha("92f6a3f"), prLookup: "found" },
  },
];

const evidence: Evidence = {
  question: messagesFor("en").landing.demo.question,
  repo: { path: "payments-service", name: "payments-service", sha: sha("4e1d0a2") },
  location: { file: LANDING_PATH, startLine: 9, endLine: 9 },
  artifacts,
  contradictions: [],
  coverage: { granularity: "line" },
};

const CITATIONS = [
  ["commit:92f6a3f", "pr:812"],
  ["issue:1187", "pr:812"],
  ["review:812-1", "review:812-0"],
];

function narrativeFor(locale: Locale): Narrative {
  const claims = messagesFor(locale).landing.demo.claims.map((text, i) => ({
    text,
    citations: CITATIONS[i],
  }));
  return {
    answerable: true,
    recorded: true,
    claims,
    answer: claims.map((c) => c.text).join(". "),
    citations: Array.from(new Set(CITATIONS.flat())),
  };
}

const check = (citation: string, claim: number, quote: string | null) => ({
  citation,
  claim,
  status: "supported" as const,
  quote,
  reason: "the source states it",
});

const entailment: Entailment = {
  checked: true,
  supported: 3,
  misattributed: 0,
  checks: [
    check("commit:92f6a3f", 0, "3 attempts with 1s/2s/4s backoff"),
    check("pr:812", 0, null),
    check("issue:1187", 1, "212 customers were charged twice"),
    check("pr:812", 1, null),
    check("review:812-1", 2, "3 gives a 7 s worst case"),
    check("review:812-0", 2, null),
  ],
};

const views = new Map<Locale, InvestigationView>();

export function landingViewFor(locale: Locale): InvestigationView {
  const known = views.get(locale);
  if (known) return known;
  const asked = { ...evidence, question: messagesFor(locale).landing.demo.question };
  const result: DigResult = {
    evidence: asked,
    narrative: verify(asked, narrativeFor(locale), entailment),
  };
  const view = buildInvestigationView(result, { now: LANDING_NOW });
  views.set(locale, view);
  return view;
}

export const landingView = landingViewFor("en");

const english = narrativeFor("en");

export const landingRejected = verify(evidence, {
  ...english,
  claims: [{ text: english.claims[1].text, citations: ["issue:1187", "pr:9999"] }],
  citations: ["issue:1187", "pr:9999"],
}).unknownCitations;

export const landingLines = [
  'import Stripe from "stripe";',
  'import { sleep } from "../lib/sleep";',
  'import { ChargeFailed } from "./errors";',
  "",
  "const stripe = new Stripe(env.STRIPE_KEY);",
  "",
  "/** Retried on transient errors. */",
  "export async function chargeCustomer(req) {",
  "  for (let attempt = 0; attempt < 3; attempt++) {",
  "    try {",
  "      return await stripe.charges.create(req);",
  "    } catch (err) {",
  "      await sleep(2 ** attempt * 1000);",
  "    }",
  "  }",
  "  throw new ChargeFailed(req.id);",
  "}",
];

export function landingVersionsFor(locale: Locale): LineVersion[] {
  const demo = messagesFor(locale).landing.demo;
  return [
    {
      artifactId: "pr:812",
      text: "  for (let attempt = 0; attempt < 5; attempt++) {",
      note: demo.firstRevision,
    },
    { artifactId: "commit:7be210e", text: "  while (true) {", absent: demo.noBound },
  ];
}

export const landingVersions = landingVersionsFor("en");

const span = (startLine: number, endLine: number, short: string, date: string): BlameSpan => ({
  startLine,
  endLine,
  sha: sha(short),
  shortSha: short,
  date,
});

const ORIGIN = "2021-06-18T14:02:00Z";
const CAP = "2023-03-15T16:20:00Z";

export const landingBlame: BlameSpan[] = [
  span(1, 4, "7be210e", ORIGIN),
  span(5, 5, "a19d3f2", "2024-02-20T10:00:00Z"),
  span(6, 6, "7be210e", ORIGIN),
  span(7, 7, "92f6a3f", CAP),
  span(8, 8, "7be210e", ORIGIN),
  span(9, 9, "92f6a3f", CAP),
  span(10, 10, "7be210e", ORIGIN),
  span(11, 11, "c0a41e9", "2023-08-20T10:00:00Z"),
  span(12, 12, "7be210e", ORIGIN),
  span(13, 13, "92f6a3f", CAP),
  span(14, 17, "7be210e", ORIGIN),
];
