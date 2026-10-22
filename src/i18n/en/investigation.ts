export const artifact = {
  kind: { commit: "commit", pull_request: "pull request", review: "review", issue: "issue" },
  reviewState: {
    APPROVED: "Approved",
    CHANGES_REQUESTED: "Changes requested",
    COMMENTED: "Commented",
    DISMISSED: "Dismissed",
    PENDING: "Pending",
  },
  undated: "undated",
  opened: (date: string) => `opened ${date}`,
  open: (from: string, to: string) => `open ${from} → ${to}`,
  relation: { pull_request: "merged as", review: "on", issue: "closed by", other: "via" },
  openOnGitHub: "Open on GitHub",
  openOnGitLab: "Open on GitLab",
  openSource: "Open source",
};

export const gap = {
  chip: { pull_request: "PR", review: "review", issue: "issue" },
  notVerified: "not verified",
  noLinkedIssue: "no linked issue",
  notRecorded: "not recorded",
  title: {
    pull_request: "No pull request, review or issue",
    review: "No review on the pull request",
    issue: "No issue linked to the pull request",
  },
  basis: {
    searched: "The provider was asked and has nothing on record.",
    skipped:
      "This commit was not looked up (outside the enrichment limit, or no supported remote).",
    failed: "The lookup failed, so nothing is known about what exists.",
    unknown: "This case was saved before lookups were tracked, so absence cannot be confirmed.",
  },
  unverifiedBody: (id: string) =>
    `Nothing is shown before ${id}, but this was not verified. Understory does not treat it as silence.`,
  noPrReading: (id: string) =>
    `Blame reaches ${id}, and no pull request, review or issue was found for it. The commit's own message is all the record holds.`,
  noPr: (id: string) =>
    `Blame reaches ${id}, but no pull request, review or issue explains it. Understory does not infer a reason here.`,
  noReview: (id: string) =>
    `${id} was merged without a recorded review. Understory does not infer what a review would have said.`,
  noIssue: (id: string) =>
    `${id} closes no issue by a closing keyword. An issue may still be mentioned elsewhere.`,
  silent: "History silent · recorded: false",
  unconfirmed: "Not verified · absence not confirmed",
};

export const reading = {
  added: "added this line",
  respaced: "changed only the spacing of this line",
  rewrote: "rewrote this line",
  scope: {
    line: "source linked directly to this line",
    change: "said of the change as a whole",
    "earlier change": "said of an earlier change to this line",
    file: "from the file's history, not this line's",
  },
  place: {
    "on the line": "comment made on this line",
    "in its hunk": "comment made near this line",
    "same file, elsewhere": "comment made elsewhere in this file",
    "another file": "comment made in another file",
  },
  onEarlierVersion: (place: string) => `${place}, on an earlier version`,
  earlierCaption: "found by following the line back · not read for a reason",
  fileOnly: "These are changes to the file. The line's own history could not be read.",
  notRead: "The line's history before this was not read.",
  notReadBecause: (why: string) => `The line's history before this was not read: ${why}.`,
  why: {
    "depth limit": "this view follows only a few changes back",
    "request limit": "this view follows only a few changes back",
    "time limit": "following it took too long",
    "no patch": "the host did not return the change",
    "line not located": "the line could not be followed through the change",
    quota: "the host's request allowance was low",
    cancelled: "the investigation was cancelled",
  },
};

export const subject = {
  lines: (start: number, end: number) =>
    start === end ? `line ${start}` : `lines ${start}–${end}`,
  file: "the file",
  commit: (ref: string) => `commit ${ref}`,
  historyOf: (label: string) => `History of ${label}`,
  around: (label: string) => `Around ${label}`,
  asItReadsNow: (label: string) => `${label} · as it reads now`,
  today: "today",
  beforeToday: (age: string) => `${age} before today`,
  between: (age: string) => `${age} between these`,
  unchangedFor: (age: string) => `unchanged for ${age}`,
  noChange: (age: string, label: string) => `${age} with no change to ${label}`,
  margin: {
    beforeToday: "before today",
    between: "between",
    unchanged: "unchanged",
    noChange: "no change",
  },
  oldestChange: (label: string) => `oldest recorded change to ${label}`,
  earliestArtifact: "earliest artifact collected",
  asked: {
    commit: "the change this case asks about",
    pull_request: "the pull request this case asks about",
    review: "the review this case asks about",
    issue: "the issue this case asks about",
  },
  wrote: (label: string) => `wrote ${label} as it reads today`,
  earlierChange: (label: string) => `an earlier change to ${label}`,
};

export const clause = {
  noReason: "no reason on record",
  sources: (n: number) => (n === 1 ? "1 source" : `${n} sources`),
  verified: (n: number) => `${n} verified`,
  weak: "weak support",
  unsupported: "not substantiated",
  unaudited: "not audited",
  notCollected: (n: number) => `${n} not collected`,
  silent: "Not recorded. No source explains this.",
  source: (letter: string, kind: string, id: string) => `${letter}, ${kind} ${id}`,
  supportedBy: (sources: string) => `Supported by ${sources}.`,
  noSource: "No collected source.",
  quotesVerified: (n: number) => (n === 1 ? "1 quote verified." : `${n} quotes verified.`),
  noQuote: "No verbatim quote.",
  weakDescription: "Sources are on topic but no line proves it.",
  unsupportedDescription: "The cited sources do not substantiate it.",
  unauditedDescription: "Not audited.",
  neverCollected: (ids: string) => `Cites ${ids}, which was never collected.`,
};

export const source = {
  missing: "Cited, but never collected · it cannot be checked",
  verified: "✓ Quote found verbatim in the source",
  weak: "Cited · on topic, but no line proves it",
  misattributed: "Cited · this source does not support the clause",
  unaudited: "Cited · not audited",
  elsewhere: "Cited · the verbatim quote is in another source",
  noQuote: "Cited · no verbatim quote in this source",
};

export const why = {
  title: "What the history supports",
  reconstructed: "Reconstructed why",
  likelyNote:
    "The passage documents the change it belongs to. Its link to this line is Understory's interpretation.",
  notIdentified: "No reason for this line is established in the record.",
  documented: "Documented for this line",
  likely: "Likely explanation",
  likelyMany: "Likely explanations",
  alsoQuoted: "Also quoted for this sentence",
  fromRecord: "From this change's record",
  lastChange: "last change",
  earlierChange: "earlier change",
  theLastChange: "the last change",
  anEarlierChange: "an earlier change",
  titled: (title: string) => `titled “${title}”`,
  part: {
    title: "title",
    message: "message",
    description: "description",
    discussion: "discussion",
    "review summary": "summary",
    "review comment": "comment",
  },
  and: "and",
  where: (head: string, parts: string) => (parts ? `${head} ${parts}` : head),
  commitHead: "commit",
  quality: {
    insufficient: "insufficient: the cited sources do not say this",
    refuted: "refuted: the cited sources say something else",
    absent: "absent: no cited source was checked",
  },
  notEstablished: (n: number) => `Not established · ${n}`,
  sentenceOf: (label: string, n: number) => `${label} · clause ${n}`,
  changes: "Changes, newest first",
  checking: (n: number) => `checking clause ${n} · Esc returns here`,
  selectClause: "select a clause to check its evidence",
  selectSentence: "select a sentence to check its evidence",
  collecting: "Collecting the line's history…",
  reconstructing: (n: number) =>
    n === 1 ? "Reconstructing from 1 artifact…" : `Reconstructing from ${n} artifacts…`,
  noHistory: "No history was found for this line.",
  noCommitAt: (sha: string) =>
    `The investigation read ${sha} and found no commit that changed it, so there is nothing to trace.`,
  noCommit: "The investigation found no commit that changed it, so there is nothing to trace.",
  noReconstruction: "No reconstruction. The evidence below is complete.",
  outOfScope:
    "The question is outside what this line's history can answer. The evidence is still shown below.",
};

export const verdict = {
  label: {
    pending: "Reconstructing…",
    "evidence-only": "Evidence only",
    "out-of-scope": "Out of scope",
    fabrication: "Fabrication caught",
    "not-recorded": "Not recorded",
    resolved: "Resolved",
  },
  title: {
    pending: "Still reconstructing",
    "evidence-only": "Why there is no reconstruction",
    "out-of-scope": "Why this is out of scope",
    fabrication: "Why a fabrication was caught",
    "not-recorded": "Why this is not recorded",
    resolved: "Why this is resolved",
  },
  answered: "Answered",
  checked: "What was checked",
  confidenceNote: "Computed from the checks above, never the model's self-assessment.",
  answeredConfidenceNote:
    "Computed from the checks above, never the model's self-assessment. It rates the answer's sources, not their link to this line.",
  derived: "Derived confidence",
  level: { high: "high", medium: "medium", low: "low" },
  grounded: (grounded: number, total: number) =>
    `${grounded} of ${total === 1 ? "1 clause" : `${total} clauses`} rest on recorded sources`,
  resolvedUnknown: (resolved: number, total: number, unknown: string) =>
    `${resolved} of ${total === 1 ? "1 citation" : `${total} citations`} resolve; ${unknown} was never collected`,
  resolved: (resolved: number, total: number) =>
    `${resolved} of ${total === 1 ? "1 citation" : `${total} citations`} resolve to real artifacts`,
  verbatim: (n: number) => (n === 1 ? "1 quote found verbatim" : `${n} quotes found verbatim`),
  misattributed: (n: number) => `${n} misattributed`,
  weak: (n: number) => `${n} weak`,
  unaudited: (n: number) => `${n} not audited`,
  auditUnavailable: "Citation audit unavailable; confidence is capped",
  uncited: (n: number) =>
    n === 1
      ? "1 clause cites nothing that was collected"
      : `${n} clauses cite nothing that was collected`,
  fileLevel: "File-level history only, not line-level",
  cosmetic: (ref: string) => `The last change, ${ref}, looks cosmetic`,
  noReconstruction: "No reconstruction was produced",
};

export const caseScreen = {
  anchoredOn: "anchored on",
  anchoredOnCommit: "anchored on commit",
  onBranch: (branch: string) => `on ${branch}`,
  collecting: "Collecting",
  failed: "Failed",
  backToQuestion: "← Back to question",
  followUp: "Follow up in this file",
  key: "Key",
  copied: "Copied",
  copyWhy: "Copy the why",
  legend: {
    commit: "commit",
    pr: "PR",
    review: "review",
    issue: "issue",
    notRecorded: "not recorded",
    notVerified: "not verified",
    cited: "cited ·",
    supporting: "supporting",
    depth: "depth = time before today",
  },
  continues: "↳ continues",
  drilledFrom: (question: string) => `drilled from “${question}”`,
  followUpTo: (question: string) => `follow-up to “${question}”`,
  artifacts: (n: number) => (n === 1 ? "1 artifact" : `${n} artifacts`),
  aroundSummary: (label: string, artifacts: string) => `Around ${label} · ${artifacts}`,
  historySummary: (n: number) => (n === 1 ? "History · 1 change" : `History · ${n} changes`),
  over: (summary: string, span: string) => `${summary} over ${span}`,
  historyArtifacts: (artifacts: string) => `History · ${artifacts}`,
  evidenceOf: (n: number) => `EVIDENCE · CLAUSE ${n}`,
  sourceOf: (i: number, total: number) => `${i} OF ${total}`,
  sourcesOfClause: "Sources of this clause",
  previousSource: "Previous source",
  nextSource: "Next source",
  closeEvidence: "Close evidence",
  noSource: "This clause cites no collected source.",
  missingSource:
    "The model named this source, but it is not in the evidence Understory collected, so the clause cannot be checked against it.",
  depthOf: (depth: string, max: string) => `${depth} of ${max}`,
  showInHistory: "Show in history ↓",
  investigate: "Investigate →",
  opensCase: (question: string) => `Opens a new case anchored here: “${question}”`,
  anchor: (label: string) => `Anchor, ${label}`,
  anchorOfCase: "anchor of this case",
  showLess: "Show less",
  showAll: "Show all",
  showFile: "Show file",
  collectedAround: (n: number) =>
    n === 1 ? "1 artifact collected around it" : `${n} artifacts collected around it`,
  blameHint: {
    ready: "hover a bar for its commit",
    loading: "loading blame…",
    unavailable: "blame unavailable for this revision",
    unpinned: "current HEAD, not the investigated revision",
  },
  codeLines: "Code lines, scroll sideways for long lines",
  loadingFile: "Loading file…",
  fileFailed: "Could not load this file.",
  hidden: (lines: string) => `⋯ ${lines}`,
  hiddenSymbol: (lines: string, symbol: string) => `⋯ ${lines} · ${symbol}`,
  lineAria: (line: number) => `Line ${line}`,
  investigatedLine: "investigated line",
  lastChangedBy: (sha: string, age: string) => `last changed by ${sha}, ${age} ago`,
};

export const questions = {
  line: "Why is this line the way it is?",
  range: "Why are these lines the way they are?",
  deepLink: "Why is this line the way it is? Reconstruct why it changed.",
  symbol: (name: string) => `Why is ${name} the way it is?`,
  anchor: {
    commit: "Why was this change made?",
    pull_request: "Why was this pull request opened?",
    issue: "Why was this issue filed?",
    review: "What did this review flag?",
  },
};

export const accessible = {
  notCited: "not cited by any clause",
  citedBy: (n: string) => `cited by clause ${n}`,
  citedByMany: (list: string, last: string) => `cited by clause ${list} and ${last}`,
  quoteVerified: "quote verified",
  noPrBefore: (target: string) => `no pull request, review or issue before ${target}`,
  noReviewOn: (target: string) => `no review on ${target}`,
  noIssueOn: (target: string) => `no linked issue on ${target}`,
  notVerified: (text: string) => `Not verified: ${text}`,
  notRecorded: (text: string) => `Not recorded: ${text}`,
  capitalized: (text: string) => text.charAt(0).toUpperCase() + text.slice(1),
};

export const drawer = {
  mergedVia: (id: string) => `merged via ${id}`,
  reviewOn: (id: string) => `on ${id}`,
  reviewsWithText: (n: number) => (n === 1 ? "1 review with text" : `${n} reviews with text`),
  mergedThrough: (id: string) => `Merged through ${id}`,
  noPrRefs: "No pull request references this commit",
  prsNotLooked: "Pull requests were not looked up for this commit",
  prLookupFailed: "The pull request lookup failed for this commit",
  closes: (id: string) => `Closes ${id}`,
  merged: (date: string) => `Merged ${date}`,
  noMergeDate: "No merge date recorded",
  noReview: "No review on record",
  closedBy: (id: string) => `Closed by ${id}`,
  state: (state: string) => `State: ${state}`,
  reviewState: (state: string) => `Review state: ${state}`,
  issueState: { open: "open", closed: "closed" },
};
