import type { Confidence } from "@git-investigator/core/types";

export const codeLines = [
  { n: 6, text: 'import { sleep } from "../lib/sleep";' },
  { n: 7, text: "" },
  { n: 8, text: "export async function chargeCustomer(req) {" },
  { n: 9, text: "  for (let attempt = 0; attempt < 3; attempt++) {", hot: true },
  { n: 10, text: "    try { return await stripe.charges.create(req); }" },
  { n: 11, text: "    catch { await sleep(2 ** attempt * 1000); }" },
  { n: 12, text: "  }" },
  { n: 13, text: "}" },
];

export const principles = [
  {
    tag: "01 · sources",
    title: "Evidence, not assertions",
    body: "Every claim points to a real commit, pull request, or issue. You read the record — the conclusion is just the index to it.",
  },
  {
    tag: "02 · grounding",
    title: "Citations are verified",
    body: "A deterministic check confirms each citation resolves to collected evidence. A fabricated source is caught, never trusted.",
  },
  {
    tag: "03 · honesty",
    title: "It admits the cold trail",
    body: "When the history doesn't explain a line, it returns a low-confidence verdict and says so — instead of inventing a plausible story.",
  },
];

export const steps = [
  {
    n: "01",
    title: "Point at a line",
    body: "Open a GitHub repo, find a file by name or symbol, and click the exact line under question.",
  },
  {
    n: "02",
    title: "Follow the trail",
    body: "Blame surfaces the commit behind the line; the pull request and issues behind that commit carry the reasoning.",
  },
  {
    n: "03",
    title: "Read the verdict",
    body: "A reconstructed “why”, every sentence grounded in a source you can open — or an honest “the record is silent.”",
  },
];

export const sampleConfidence: Confidence = {
  score: 0.92,
  level: "high",
  primarySources: 4,
  corroborating: 2,
  contradicting: 0,
};

export const reviewCopilot = {
  tag: "// review copilot",
  title: "Reviewing a pull request? See the why behind every change.",
  body: "Paste a GitHub PR and read the grounded reasoning behind the code it touches — riskiest changes first, each claim linked to the commits, pull requests, and reviews that justify it. The context a diff never shows you.",
  cta: "Explain a PR",
  example: "chalk/chalk#664",
  finding: {
    risk: "High risk",
    target: "src/index.js:42",
    why: "This retry cap was set to 3 after issue #1187 — an unbounded loop double-charged customers during an outage. Loosening it here reopens that incident.",
    grounded: [
      { kind: "pr", id: "pr:812" },
      { kind: "issue", id: "issue:1187" },
      { kind: "review", id: "review:approved" },
    ],
  },
} as const;
