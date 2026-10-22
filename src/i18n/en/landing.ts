export const meta = {
  description:
    "Reconstruct the historical reason behind code decisions. Grounded in git, built to say so when the record is silent.",
};

export const landing = {
  tagline: "code archaeology",
  nav: "Main",
  explain: "Explain a line",
  explainGo: "Explain a line →",
  howItWorks: "How it works",
  hero: {
    contrast: <N>(blame: N, who: N, when: N, why: N) => [
      blame,
      " tells you ",
      who,
      " and ",
      when,
      ". This tells you ",
      why,
      ".",
    ],
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
    clauses: {
      title: "Every clause points to its sources",
      body: "Each statement carries the letters of the artifacts behind it. The conclusion is an index to the record.",
    },
    citations: {
      title: "Citations are checked, not trusted",
      body: "A deterministic check finds every quote in its source. A fabricated reference is caught before you see it.",
    },
    silence: {
      title: "It shows where the trail goes cold",
      body: "A gap counts as silence only when the provider confirms nothing is there. And when no source gives a reason, the answer is built to say so, not to guess.",
    },
    quoteFound: (id: string) => `✓ Quote found verbatim in ${id}`,
    rejected: "not in evidence, rejected",
    direct: "direct commit",
    reason: (label: string) => `reason: ${label}`,
  },
  method: {
    title: "From a line you don't understand to the decision behind it.",
    point: {
      title: "Point at a line",
      body: "Open a GitHub repo, find a file by name or symbol, and select the exact line in question.",
    },
    follow: {
      title: "Follow the trail down",
      body: "Blame finds the commit; the pull request, reviews and issues behind it carry the reasoning, placed at their real depth in time.",
    },
    read: {
      title: "Read the reconstruction",
      body: "A reconstructed why, each clause tied to a source you can open, or an honest “the record is silent.”",
    },
    trail: { commit: "commit", pullRequest: "pull request · review", issue: "issue" },
    silence: "Why it retries at all: not recorded",
  },
  closing: {
    title: "Interrogate your own code.",
    body: "Point it at a repository and a line. See what the history really says.",
  },
  demo: {
    region: (path: string, line: number) => `Example investigation of ${path} line ${line}`,
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
    summary: {
      artifacts: (n: number) => (n === 1 ? "1 artifact" : `${n} artifacts`),
      clauses: (n: number) => (n === 1 ? "1 clause" : `${n} clauses`),
      silences: (n: number) => (n === 1 ? "1 silence" : `${n} silences`),
    },
    askedToken: (token: string, line: number) => `asked of the token ${token} · line ${line}`,
    askedLine: (line: number) => `asked of line ${line}`,
    current: (line: number) => `commit · wrote line ${line} as it reads today`,
    originSilent: "The line’s origin is silent",
    recordSilent: "The record is silent here",
    origin: (line: number, years: string) => `origin · line ${line} first written ${years}y deep`,
    tally: (sources: number, quotes: number) =>
      `${sources === 1 ? "1 source" : `${sources} sources`} · ${quotes === 1 ? "1 quote" : `${quotes} quotes`} verified`,
    heading: "reconstructed why · read downward",
    scroll: "Line history, scroll sideways for long lines",
    code: (from: number, to: number) => `Code, lines ${from}–${to}`,
    specimenLines: (path: string, from: number, to: number) => `${path}, lines ${from}–${to}`,
    quoted: "quoted verbatim",
    silentAge: (age: string) => `${age} · record silent`,
    notRecorded: "not recorded",
    unchanged: "unchanged",
    legend: {
      depth: "depth = time · the bore follows the token down",
      cited: "cited",
      context: "context",
      trace: "verified trace",
      silent: "silent record",
    },
  },
};
