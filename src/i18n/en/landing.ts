export const meta = {
  description:
    "Reconstruct the historical reason behind code decisions. Grounded in git, built to say so when the record is silent.",
};

export const landing = {
  tagline: "code archaeology",
  nav: "Main",
  explain: "Explain a line",
  explainGo: "Explain a line →",
  hero: {
    who: "who",
    when: "when",
    why: "why",
    title: "Why is this line",
    titleMark: "here?",
    lead: "Understory reconstructs the reasoning behind a line of code by tracing commits, pull requests, and issues back to the decision that introduced it.",
  },
  standard: {
    title: "Not a chat about your repo. A record you can audit.",
    kicker: "evidence > assertions",
    quoteFound: (id: string) => `✓ Quote found verbatim in ${id}`,
    rejected: "not in evidence, rejected",
  },
  method: {
    silence: "Why it retries at all: not recorded",
  },
  closing: {
    title: "Interrogate your own code.",
    body: "Point it at a repository and a line. See what the history really says.",
  },
  dig: {
    whyMissing: "not in blame",
    what: "what",
    today: "today",
    cue: "scroll to dig · depth = time",
    digGo: "Dig through an example",
    unchanged: (age: string, line: number) => `scale break · ${age}, line ${line} unchanged`,
    answer: (done: number, total: number) => `reconstructed why · ${done} of ${total}`,
    answerOpen: "left open in the answer, not guessed",
    chapters: "Chapters",
    chapter: (n: string) => `Chapter ${n}`,
    names: ["The line", "The blame", "The trail", "The source", "The silence", "The reading"],
    progress: (done: number, total: number) => `${done} of ${total}`,
    open: (n: number) => `${n} open`,
    first: {
      title: "Blame stops here.",
      note: "It names the last commit to touch the line. Not the reason for it.",
    },
    trail: {
      title: "Thirteen days in March 2023.",
      note: "The commit leads to a pull request, two reviews and an issue.",
    },
    proof: {
      title: "Checked against the source.",
      note: "Each clause names its records. Each quote is found verbatim before you see it.",
    },
    silence: {
      title: "The record is silent here.",
      looked: "looked for, and the provider has none",
    },
    reading: {
      title: "Three reasons on record. One question left open.",
      reconstructed: "reconstructed",
      verified: "verified",
      quotes: (n: number) => (n === 1 ? "1 quote found verbatim" : `${n} quotes found verbatim`),
      open: "Why it retries at all",
      openBody: (age: string) =>
        `For ${age} before the fix, no pull request, review or issue explains the first version. The answer leaves it open.`,
    },
    closing: {
      line: "a line in your repository",
      depth: "depth unknown",
    },
  },
  demo: {
    question: "Why exactly 3 retries?",
    claims: [
      "Capped at 3, with backoff",
      "After 212 customers were charged twice",
      "Review cut 5 → 3 to fit a 10 s timeout",
    ],
    firstRevision: "first revision",
    noBound: "no bound",
    lineRead: "Line read",
    line: (n: number) => `line ${n}`,
    origin: (line: number, years: string) => `origin · line ${line} first written ${years}y deep`,
    notRecorded: "not recorded",
  },
};
