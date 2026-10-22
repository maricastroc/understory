export const report = {
  backToCode: "Back to code",
  inconclusive: "Inconclusive",
  exhibits: (n: number) => (n === 1 ? "1 exhibit" : `${n} exhibits`),
  exhibit: (letter: string) => `Exhibit ${letter}`,
  confidence: (level: string) => `${level} confidence`,
  level: { high: "High", medium: "Medium", low: "Low" },
  kind: { commit: "Commit", pull_request: "Pull request", issue: "Issue", review: "Review" },
  noConclusion: "No conclusion was produced. Showing the collected evidence only.",
  copiedToClipboard: "Copied to clipboard",
  findings: {
    title: "Findings",
    meta: "Reconstructed conclusion, each claim linked to the sources it cites",
    pendingMeta: "Reconstructing the conclusion from the evidence…",
    pending: "Reconstructing the conclusion…",
    pendingBody:
      "Synthesizing the answer and auditing every citation in-source. The evidence and provenance chain below already stand.",
    concluded: "Investigation conclusion",
    noRecord: "No conclusion on record",
    uncited: "uncited",
    grounded: "Every citation grounded",
    fabrication: "Fabrication detected",
    auditUnavailable: "Citation audit unavailable, confidence capped",
    notSubstantiated: (n: number) => `${n} not substantiated`,
    substantiated: (n: number) => `${n} substantiated in-source`,
    checkedInSource: "citations checked in-source",
    contradicted: (n: number) =>
      n === 1
        ? "A cited source is contradicted by later history"
        : `${n} cited sources are contradicted by later history`,
    contradictedNote: "The recorded reason was later undone or declined, so confidence is lowered.",
    substantiation: "Substantiation · quoted verbatim from the source",
    fabricated: (n: number) =>
      n === 1
        ? "1 fabricated citation caught by verification:"
        : `${n} fabricated citations caught by verification:`,
    notCollected: "Not in the collected evidence.",
    misattributed: (n: number) =>
      n === 1
        ? "A cited source doesn't substantiate the claim"
        : `${n} cited sources don't substantiate the claim`,
    misattributedNote:
      "The citation id is real, but the source text does not back the claim. Checked by entailment, it does not count as support.",
    uncitedSentences: (n: number) =>
      n === 1
        ? "1 sentence in this answer cites no collected source. Shown for transparency, not counted toward confidence."
        : `${n} sentences in this answer cite no collected source. Shown for transparency, not counted toward confidence.`,
    outOfScopeMeta: "The question could not be matched to this code's history",
    outOfScope: "Question outside investigation scope",
    outOfScopeAnswer:
      "This question can't be answered from the selected code and its history. Try asking why the line exists, changed, or was introduced.",
    sourcesUsed: "Sources used",
    sourceNoun: { pull_request: "PR", commit: "Commit", issue: "Issue", review: "Review" },
  },
  chain: {
    title: "Provenance chain",
    meta: "Issue → pull request → review → commit: the causal path to this line, and where it breaks",
    onChain: "On the cited chain",
    noIssue: "no issue linked",
    noReview: "no review recorded",
    direct: "Committed directly, with no pull request, issue, or review in the trail",
    commitsOnly:
      "No pull request, issue, or review was found upstream of these commits. The recorded history for this line is the commits themselves.",
    grouped:
      "Structural links aren’t recorded for this saved case, so the trail is grouped by role.",
    complete: "Complete trail: every change traces back to a pull request, an issue, and a review.",
    gaps: (n: number) =>
      `${n === 1 ? "gap" : "gaps"} in the causal trail, shown dashed below. The line’s recorded reason stops there.`,
    fewer: "Show fewer paths",
    all: (n: number) => `Show all ${n} paths`,
    more: (n: number) => `· ${n} more`,
  },
  evidence: {
    title: "Evidence",
    meta: (total: number, cited: number, supporting: number) =>
      `${total === 1 ? "1 exhibit" : `${total} exhibits`} · ${cited} cited · ${supporting} supporting`,
    cited: "Cited",
    supporting: "Supporting",
    drillTitle: (question: string, kind: string) =>
      `Open a new grounded case anchored on this ${kind} that asks: “${question}”`,
    investigate: "Investigate:",
  },
  timeline: {
    title: "Provenance timeline",
    meta: "PR → commit → review → merge: the chain that shaped this line, oldest first",
    onChain: (total: number) => `of ${total} on the provenance chain`,
    showAll: (n: number) => `Show all ${n} changes`,
    hidden: (n: number) => `· ${n} earlier hidden`,
    onChainBadge: "On chain",
    current: "· current",
  },
  rail: {
    label: "Investigation details",
    repository: "Repository",
    branch: "Branch",
    anchor: "Anchor",
    history: "History",
    commits: (n: number) => (n === 1 ? "1 commit" : `${n} commits`),
    contributors: "Contributors",
    remote: "Remote",
    open: "open",
    chain: "Provenance chain",
    people: "Who's involved",
    allGrounded: "All citations grounded",
    fabricated: (n: number) => (n === 1 ? "1 fabricated citation" : `${n} fabricated citations`),
    groundedNote:
      "Every cited source resolves to a real, collected artifact. 0 unverified citations.",
    fabricatedNote:
      "A cited source was not found in the collected evidence. Verification caught it.",
    primary: "Primary sources",
    corroborating: "Corroborating",
    contradicting: "Contradicting",
  },
};
