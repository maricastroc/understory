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
    lead: "Understory investigates why a line of code exists. It goes through commits, pull requests and issues to find the decisions that led to it.",
  },
  standard: {
    kicker: "evidence > assertions",
    quoteFound: (ref: string) => `✓ Quote confirmed in ${ref}`,
    rejected: "discarded: not in the evidence",
  },
  method: {
    silence: "Why retry at all? No explanation on record.",
  },
  closing: {
    title: "Interrogate your own code.",
    body: "Pick a repository and a line of code. Find out what its history says about it.",
  },
  dig: {
    asked: (token: string, line: number) => `asked about the number ${token} · line ${line}`,
    whyMissing: "not in blame",
    what: "what",
    today: "today",
    cue: "scroll to dig · depth = time",
    digGo: "Dig through an example",
    unchanged: (age: string, line: number) => `scale break · ${age}, line ${line} unchanged`,
    answer: (done: number, total: number) => `reasons found · ${done} of ${total}`,
    answerOpen: "Without evidence, the answer leaves it open.",
    chapters: "Chapters",
    chapter: (n: string) => `Chapter ${n}`,
    names: ["The line", "The blame", "The trail", "The source", "The silence", "The reading"],
    progress: (done: number, total: number) => `${done} of ${total}`,
    open: (n: number) => `${n} open`,
    first: {
      title: "Blame stops here.",
      note: "git blame shows who changed the line and when. It doesn't say why.",
    },
    trail: {
      title: "Thirteen days in March 2023.",
      note: "From the commit, the investigation finds a pull request, two reviews and an issue.",
    },
    proof: {
      title: "Checked against the source.",
      note: "Each conclusion points to the records behind it. Quotes are checked directly against their sources.",
    },
    silence: {
      title: "The record is silent here.",
      note: (ref: string) =>
        `The history reaches commit ${ref}, but no pull request, review or issue explains the decision. Without enough evidence, Understory leaves the question open.`,
      looked: "No record found in the sources checked",
    },
    reading: {
      title: "Three reasons on record. One question left open.",
      note: "Every answer comes with the evidence you need to check how it was built.",
      reconstructed: "reconstructed",
      verified: "verified",
      quotes: (n: number) => (n === 1 ? "1 quote confirmed" : `${n} quotes confirmed`),
      open: "Why retry at all?",
      openBody: (age: string) =>
        `The first version stood for ${age} with no record explaining where it came from. Understory keeps that question open.`,
    },
    closing: {
      line: "a line in your repository",
      depth: "depth unknown",
    },
  },
  demo: {
    question: "Why exactly 3 retries?",
    claims: [
      "Capped at 3 attempts, with backoff",
      "The change came after 212 customers were charged twice",
      "In review, the cap dropped from 5 to 3 because of a 10-second timeout",
    ],
    noBound: "no bound",
    lineRead: "Earlier version of the line",
    line: (n: number) => `line ${n}`,
    origin: (line: number, years: string) =>
      `origin · line ${line} first written ${years} years ago`,
    notRecorded: "not recorded",
  },
};
