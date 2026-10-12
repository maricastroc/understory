import { describe, expect, it } from "vitest";
import { auditSubject, checkEntailment, entailClaims, finalizeClaim } from "./entail";
import { verifyQuote } from "./quote";
import { TOOL_CALL_ERROR, failingJudge, scriptedJudge } from "./testing/scripted-judge";
import type { Artifact, Evidence, Narrative } from "./types";
import { verify } from "./verify";

const artifact = (id: string, body: string): Artifact => ({
  id,
  kind: "commit",
  title: id,
  body,
  url: "",
  date: "2024-01-01T00:00:00Z",
});

const BODY =
  "Cap retries at 3 because the upstream gateway rate-limits\nbursts above five per second.";

describe("finalizeClaim — the judge cannot vouch for itself", () => {
  const source = artifact("commit:c1", BODY);

  it("keeps the unverified-quote note even when the judge gave no reason", () => {
    const r = finalizeClaim([source], {
      status: "supported",
      quotes: ["invented"],
      reason: "",
    });
    expect(r.status).toBe("weak");
    expect(r.reason).toBe("the cited quote was not found in the source");
  });

  it("downgrades 'supported' with no quote at all to 'weak'", () => {
    const r = finalizeClaim([source], {
      status: "supported",
      quotes: [],
      reason: "stated",
    });
    expect(r.status).toBe("weak");
    expect(r.quotes).toEqual([]);
  });

  it("keeps 'weak' as-is and only surfaces a verified quote", () => {
    const r = finalizeClaim([source], {
      status: "weak",
      quotes: ["no such text"],
      reason: "on topic, does not state it",
    });
    expect(r.status).toBe("weak");
    expect(r.quotes).toEqual([]);
  });

  it("passes 'unsupported' through with no quote", () => {
    const r = finalizeClaim([source], {
      status: "unsupported",
      quotes: ["the upstream gateway rate-limits"],
      reason: "unrelated",
    });
    expect(r.status).toBe("unsupported");
    expect(r.quotes).toEqual([]);
  });
});

describe("finalizeClaim — what the judge quoted is kept on the record", () => {
  const source = artifact(
    "commit:a4a868e",
    'Make all promises inspectable by default\n\nCustom promises have a state of "unknown" by default.  All custom\npromises have an "inspect" method, regardless of whether one is\nspecified.',
  );

  it("keeps the passage it rejected, so the downgrade can be read later", () => {
    const r = finalizeClaim([source], {
      status: "supported",
      quotes: ["Every promise can now be inspected."],
      reason: "stated",
    });
    expect(r.status).toBe("weak");
    expect(r.rejectedQuotes).toEqual(["Every promise can now be inspected."]);
  });

  it("accepts the source's words when only the quotation marks differ, and stores the source's own", () => {
    const r = finalizeClaim([source], {
      status: "supported",
      quotes: [
        "All custom promises have an 'inspect' method, regardless of whether one is specified.",
      ],
      reason: "stated",
    });
    expect(r.status).toBe("supported");
    expect(r.rejectedQuotes).toEqual([]);
    expect(r.quotes[0].text).toBe(
      'All custom promises have an "inspect" method, regardless of whether one is specified.',
    );
  });

  it("stands on the passages that are in the source and records the one that is not", () => {
    const r = finalizeClaim([source], {
      status: "supported",
      quotes: [
        "Make all promises inspectable by default",
        'Custom promises have an state of "unknown" by default.',
      ],
      reason: "stated",
    });
    expect(r.status).toBe("supported");
    expect(r.quotes.map((q) => q.text)).toEqual(["Make all promises inspectable by default"]);
    expect(r.rejectedQuotes).toEqual(['Custom promises have an state of "unknown" by default.']);
  });

  it("reads an item of several whole sentences one sentence at a time", () => {
    const r = finalizeClaim([source], {
      status: "supported",
      quotes: [
        "Make all promises inspectable by default. Custom promises have a state of 'unknown' by default.",
      ],
      reason: "stated",
    });
    expect(r.status).toBe("supported");
    expect(r.quotes.map((q) => q.text)).toEqual([
      "Make all promises inspectable by default",
      'Custom promises have a state of "unknown" by default',
    ]);
  });

  it("refuses the item when one of its sentences is not the source's", () => {
    const r = finalizeClaim([source], {
      status: "supported",
      quotes: ["Make all promises inspectable by default. Every promise can now be inspected."],
      reason: "stated",
    });
    expect(r.status).toBe("weak");
    expect(r.rejectedQuotes).toHaveLength(1);
  });
});

describe("finalizeClaim — a claim judged against several sources", () => {
  const outage = artifact(
    "issue:7",
    "The Stripe webhook backlog caused duplicate charges during the outage.",
  );
  const retry = artifact("commit:c1", "Bound the charge retries to three attempts.");

  it("verifies the quote against whichever source contains it and tags that source", () => {
    const r = finalizeClaim([retry, outage], {
      status: "supported",
      quotes: ["duplicate charges during the outage"],
      reason: "outage motivated the change",
    });
    expect(r.status).toBe("supported");
    expect(r.quotes).toEqual([
      { sourceId: "issue:7", text: "duplicate charges during the outage" },
    ]);
  });

  it("demotes 'supported' to 'weak' when no source contains the quote", () => {
    const r = finalizeClaim([retry, outage], {
      status: "supported",
      quotes: ["because the database was slow"],
      reason: "invented link",
    });
    expect(r.status).toBe("weak");
    expect(r.quotes).toEqual([]);
    expect(r.reason).toBe("invented link (the cited quote was not found in the source)");
  });

  it("keeps 'weak' without requiring a quote — an asserted link the sources don't prove", () => {
    const r = finalizeClaim([retry, outage], {
      status: "weak",
      quotes: [],
      reason: "both facts present, link not stated",
    });
    expect(r.status).toBe("weak");
    expect(r.quotes).toEqual([]);
  });
});

const PR_4011_BODY =
  "deps: setprototypeof@1.2.0\n\nUpdate setprototypeof.  No impact here, but includes a fix for a possible prototype pollution in the fallback.  Can be ported to `5.x` as well.\n\n— discussion —\n@wesleytodd: To be very clear, this is not a security update.  There are no uses of this module in express which allow for a prototype pollution.  The update changes `obj.hasOwnProperty(prop)`, which if used on untrusted user input  can result in a prototype polution.  **Express does not use this module on untrusted user input**.";

describe("regression P2 — a truthful quote the judge abbreviated with '...'", () => {
  const abbreviated = PR_4011_BODY.replace(" in a prototype polution.  ", "... ");

  it("does not verify the abbreviated quote — there is no special handling for '...'", () => {
    expect(verifyQuote(PR_4011_BODY, abbreviated)).toBeNull();
  });

  it("lands on weak with the unverified note, not on a misattribution", () => {
    const r = finalizeClaim([artifact("pr:4011", PR_4011_BODY)], {
      status: "supported",
      quotes: [abbreviated],
      reason: "the PR states the bump and that it is not a security update",
    });
    expect(r.status).toBe("weak");
    expect(r.quotes).toEqual([]);
    expect(r.reason).toMatch(/the cited quote was not found in the source/);
  });
});

const RELEASE_47_BODY =
  "Release 4.7\n\nThis is a tracking issue for release 4.7.\n\nI am trying to give better visibility for upcoming changes and so am trying out making a PR for a release here, pulling from the official next release branch into master. This allows for the current pending changes to be easily visible.\n\n**Please keep feature requests in their own issues**\n\nI'm also leaving this PR unlocked so people can make comments/etc. and we'll see how it goes :) If you want to make a comment on a particular change, please make the comment in the \"Files changed\" tab so comments are not lost during a rebase.\n\nList of changes for release:\n- [x] Add Korean documentation #2242 #2244\n- [x] Deprecate `res.send(status, body)` format #2227\n- [x] Fix errors/hangs sending 500/404 if request had body https://github.com/expressjs/finalhandler/commit/00633b4186ca4d7f6ca91d5c8c04db7bddd8ec24\n- [x] Fix `req.protocol` for proxy-direct connections #2252\n- [x] Make `req.query` parsing configurable #2215";

const PERF_COMMIT: Artifact = {
  id: "commit:c6e6203",
  kind: "commit",
  title: "perf: fix arguments reassign deopt in some res methods",
  body: "perf: fix arguments reassign deopt in some res methods",
  url: "",
  date: "2014-07-11T21:13:07Z",
};

const RELEASE_PR: Artifact = {
  id: "pr:2236",
  kind: "pull_request",
  title: "Release 4.7",
  body: RELEASE_47_BODY,
  url: "",
  date: "2014-07-14T15:20:32Z",
  parentId: "commit:c6e6203",
};

const INVENTED_LIST_ITEM = "- [x] Fix arguments reassign deopt in some res methods";

describe("regression L7 — a claim the release PR does not substantiate", () => {
  it("an invented quote leaves the claim weak instead of misattributed", () => {
    const r = finalizeClaim([RELEASE_PR], {
      status: "supported",
      quotes: [INVENTED_LIST_ITEM],
      reason: "the PR lists the fix",
    });
    expect(r.status).toBe("weak");
    expect(r.quotes).toEqual([]);
  });

  it("a verbatim but irrelevant quote still passes — the gate checks integrity, the judge owns relevance", () => {
    const r = finalizeClaim([RELEASE_PR], {
      status: "supported",
      quotes: ["This is a tracking issue for release 4.7."],
      reason: "the PR lists the fix",
    });
    expect(r.status).toBe("supported");
    expect(r.quotes[0].sourceId).toBe("pr:2236");
  });

  it("an unverifiable quote on a secondary claim no longer blocks the owning commit's HIGH", async () => {
    const ev: Evidence = {
      question: "Why is this line the way it is? Reconstruct why it changed.",
      repo: { path: "https://github.com/expressjs/express" },
      location: { file: "lib/response.js", startLine: 150, endLine: 150 },
      artifacts: [PERF_COMMIT, RELEASE_PR],
      contradictions: [],
      coverage: { granularity: "line" },
    };
    const n: Narrative = {
      answerable: true,
      recorded: true,
      answer: "",
      citations: ["commit:c6e6203", "pr:2236"],
      claims: [
        {
          text: "In July 2014 a performance issue was identified where reassigning the `arguments` object inside some response methods caused V8 to deoptimize those functions.",
          citations: ["commit:c6e6203"],
        },
        {
          text: "The commit c6e6203 changed the implementation in lib/response.js (including line 150) to stop reassigning arguments, thereby fixing the deoptimization.",
          citations: ["commit:c6e6203"],
        },
        {
          text: "This fix was packaged in the 4.7 release, which is tracked by pull request #2236 along with other changes.",
          citations: ["pr:2236"],
        },
      ],
    };
    const judge = scriptedJudge((prompt) =>
      prompt.includes("4.7 release")
        ? { status: "supported", quotes: [INVENTED_LIST_ITEM], reason: "the PR lists the fix" }
        : prompt.includes("stop reassigning")
          ? {
              status: "unproven",
              quotes: [],
              reason: "the file and line are not in the commit text",
            }
          : {
              status: "supported",
              quotes: ["fix arguments reassign deopt in some res methods"],
              reason: "stated",
            },
    );
    const e = await entailClaims(
      ev.question,
      n.claims,
      new Map(ev.artifacts.map((a) => [a.id, a])),
      { primary: judge, fallback: null },
    );
    expect(e.misattributed).toBe(0);
    expect(e.checks.find((c) => c.claim === 2)?.status).toBe("weak");

    const v = verify(ev, n, e);
    expect(v.confidence.level).toBe("high");
    expect(v.confidence.score).toBe(0.85);
  });
});

describe("entailClaims — bare commit shas", () => {
  const commit = artifact("commit:c319fe2", "Ship the Object.setPrototypeOf polyfill.");
  const byId = new Map([[commit.id, commit]]);
  const verdict = { status: "unproven", quotes: [], reason: "on topic" };

  it("audits a claim that cites a collected commit by its bare sha, under the canonical id", async () => {
    const judge = scriptedJudge(() => verdict);
    const e = await entailClaims(
      "q",
      [{ text: "The polyfill shipped.", citations: ["c319fe2"] }],
      byId,
      { primary: judge, fallback: null },
    );
    expect(judge.doGenerateCalls).toHaveLength(1);
    expect(e.checks).toMatchObject([{ citation: "commit:c319fe2", claim: 0, status: "weak" }]);
  });

  it("does not audit a claim whose bare sha names no collected commit", async () => {
    const judge = scriptedJudge(() => verdict);
    const e = await entailClaims("q", [{ text: "Invented.", citations: ["deadbee"] }], byId, {
      primary: judge,
      fallback: null,
    });
    expect(judge.doGenerateCalls).toHaveLength(0);
    expect(e.checked).toBe(false);
  });
});

describe("entailClaims — hybrid auditor (20b, falling back to 120b on a technical failure)", () => {
  const source = artifact("commit:c1", "Bound the charge retries to three attempts.");
  const byId = new Map([[source.id, source]]);
  const claims = [{ text: "Retries were bounded to three attempts.", citations: ["commit:c1"] }];
  const supported = {
    status: "supported",
    quotes: ["Bound the charge retries to three attempts."],
    reason: "stated",
  };

  it("uses the primary judge and never calls the fallback when it answers", async () => {
    const primary = scriptedJudge(() => supported);
    const fallback = scriptedJudge(() => supported);
    const e = await entailClaims("q", claims, byId, { primary, fallback });
    expect(e).toMatchObject({ checked: true, supported: 1, failed: 0, fallbacks: 0 });
    expect(fallback.doGenerateCalls).toHaveLength(0);
  });

  it.each([
    ["unproven", { status: "unproven", quotes: [], reason: "thin" }],
    ["unrelated", { status: "unrelated", quotes: [], reason: "off-topic" }],
    ["an unverifiable quote", { status: "supported", quotes: ["invented text"], reason: "x" }],
  ])("does not fall back on %s — only a technical failure does", async (_, verdict) => {
    const primary = scriptedJudge(() => verdict);
    const fallback = scriptedJudge(() => supported);
    const e = await entailClaims("q", claims, byId, { primary, fallback });
    expect(fallback.doGenerateCalls).toHaveLength(0);
    expect(e.fallbacks).toBe(0);
    expect(e.checks[0].status).not.toBe("supported");
  });

  it("falls back when the primary call fails technically, and records the fallback", async () => {
    const primary = failingJudge();
    const fallback = scriptedJudge(() => supported);
    const e = await entailClaims("q", claims, byId, { primary, fallback });
    expect(primary.doGenerateCalls).toHaveLength(1);
    expect(fallback.doGenerateCalls).toHaveLength(1);
    expect(e).toMatchObject({ checked: true, supported: 1, failed: 0, fallbacks: 1 });
    expect(e.checks[0]).toMatchObject({ status: "supported", quote: supported.quotes[0] });
  });

  it("records the failure instead of dropping it when both judges fail", async () => {
    const e = await entailClaims("q", claims, byId, {
      primary: failingJudge(),
      fallback: failingJudge(),
    });
    expect(e).toMatchObject({ checked: false, checks: [], failed: 1, fallbacks: 0 });
  });

  it("records the failure when no fallback is configured", async () => {
    const e = await entailClaims("q", claims, byId, { primary: failingJudge(), fallback: null });
    expect(e).toMatchObject({ checked: false, failed: 1 });
  });

  it("keeps the judged claims and counts the one that failed", async () => {
    const other = artifact("commit:c2", "Add jitter so clients stop retrying in lockstep.");
    const two = [...claims, { text: "Jitter stops lockstep retries.", citations: ["commit:c2"] }];
    const primary = scriptedJudge((prompt) =>
      prompt.includes("Jitter") ? new Error(TOOL_CALL_ERROR) : supported,
    );
    const e = await entailClaims(
      "q",
      two,
      new Map([
        [source.id, source],
        [other.id, other],
      ]),
      { primary, fallback: null },
    );
    expect(e).toMatchObject({ checked: true, supported: 1, failed: 1 });
    expect(e.checks.map((c) => c.claim)).toEqual([0]);
  });
});

describe("entailClaims — output budget", () => {
  it("caps each audit's output at 2,000 tokens", async () => {
    const source = artifact("commit:c1", "Bound the charge retries to three attempts.");
    const judge = scriptedJudge(() => ({ status: "unproven", quotes: [], reason: "thin" }));
    await entailClaims(
      "q",
      [{ text: "Retries were bounded.", citations: ["commit:c1"] }],
      new Map([[source.id, source]]),
      { primary: judge, fallback: null },
    );
    expect(judge.doGenerateCalls[0].maxOutputTokens).toBe(2_000);
  });
});

describe("auditSubject — what the history settles before the judge reads a word", () => {
  const ev = (over: Partial<Evidence> = {}): Evidence => ({
    question: "Why is this line the way it is?",
    repo: { path: "." },
    location: { file: "libmachine/host/host.go", startLine: 168, endLine: 168 },
    artifacts: [],
    contradictions: [],
    coverage: { granularity: "line" },
    ...over,
  });

  it("names the code and gives as settled that the cited changes touched it", () => {
    const subject = auditSubject(ev());
    expect(subject?.exact).toBe(true);
    expect(subject?.established).toContain("libmachine/host/host.go:168");
    expect(subject?.established).toContain(
      "That a\ncited commit or pull request changed this code is given.",
    );
  });

  it("does not give that away when only the file's history could be read", () => {
    const subject = auditSubject(ev({ coverage: { granularity: "file" } }));
    expect(subject?.exact).toBe(false);
    expect(subject?.established).toContain("That they changed the file is given.");
    expect(subject?.established).toContain("changed this exact code is not.");
  });

  it("says nothing when the investigation is not anchored on a code location", () => {
    expect(auditSubject(ev({ location: undefined }))).toBeNull();
  });
});

describe("the judge's request", () => {
  const source = artifact("commit:d3ee30b", "Add support for upgrade to new CE edition");
  const claim = {
    text: "The line at libmachine/host/host.go:168 was added to support upgrading to the CE edition.",
    citations: ["commit:d3ee30b"],
  };
  const supported = {
    status: "supported",
    quotes: ["Add support for upgrade to new CE edition"],
    reason: "stated",
  };
  const evidence: Evidence = {
    question: "Why is this line the way it is?",
    repo: { path: "." },
    location: { file: "libmachine/host/host.go", startLine: 168, endLine: 168 },
    artifacts: [source],
    contradictions: [],
    coverage: { granularity: "line" },
  };
  const narrative: Narrative = {
    answerable: true,
    recorded: true,
    answer: "",
    citations: ["commit:d3ee30b"],
    claims: [claim],
  };
  const sent = (judge: ReturnType<typeof scriptedJudge>) =>
    JSON.stringify(judge.doGenerateCalls[0].prompt);

  it("tells the judge which code is under investigation and what its history settles", async () => {
    const judge = scriptedJudge(() => supported);
    const e = await checkEntailment(evidence, narrative, { primary: judge, fallback: null });
    expect(sent(judge)).toContain("Established by the repository's history, not under review:");
    expect(sent(judge)).toContain("libmachine/host/host.go:168");
    expect(sent(judge)).toContain("a commit that changed the code under investigation:");
    expect(e.supported).toBe(1);
  });

  it("says of each source what it is to that code", async () => {
    const pr = {
      ...artifact("pr:4002", "Add support for upgrade to new CE edition"),
      kind: "pull_request" as const,
      parentId: "commit:d3ee30b",
    };
    const review = {
      ...artifact("review:4002-0", "A little scary, but seems generally sane"),
      kind: "review" as const,
      parentId: "pr:4002",
    };
    const judge = scriptedJudge(() => supported);
    await checkEntailment(
      { ...evidence, artifacts: [source, pr, review] },
      { ...narrative, claims: [{ ...claim, citations: ["pr:4002", "review:4002-0"] }] },
      { primary: judge, fallback: null },
    );
    expect(sent(judge)).toContain(
      "the pull request that merged commit:d3ee30b, so it changed the code under investigation too:",
    );
    expect(sent(judge)).toContain("a review comment on pr:4002:");
  });

  it("claims only the file for the sources when the line's history could not be read", async () => {
    const judge = scriptedJudge(() => supported);
    await checkEntailment({ ...evidence, coverage: { granularity: "file" } }, narrative, {
      primary: judge,
      fallback: null,
    });
    expect(sent(judge)).toContain("a commit that changed the file under investigation:");
  });

  it("leaves that section out when no code location is known", async () => {
    const judge = scriptedJudge(() => supported);
    await entailClaims("q", [claim], new Map([[source.id, source]]), {
      primary: judge,
      fallback: null,
    });
    expect(sent(judge)).not.toContain("Established by the repository's history");
    expect(sent(judge)).not.toContain("under investigation:");
  });

  it("reads the judge's 'unproven' as weak and 'unrelated' as a misattribution", async () => {
    const reply = (status: string) => scriptedJudge(() => ({ status, quotes: [], reason: "x" }));
    const run = (status: string) =>
      entailClaims("q", [claim], new Map([[source.id, source]]), {
        primary: reply(status),
        fallback: null,
      });
    expect((await run("unproven")).checks[0].status).toBe("weak");
    expect(await run("unrelated")).toMatchObject({ misattributed: 1 });
    expect((await run("unrelated")).checks[0].status).toBe("unsupported");
  });

  it("writes the rejected passage into the check it downgraded", async () => {
    const judge = scriptedJudge(() => ({
      status: "supported",
      quotes: ["Added to support the CE upgrade path."],
      reason: "stated",
    }));
    const e = await entailClaims("q", [claim], new Map([[source.id, source]]), {
      primary: judge,
      fallback: null,
    });
    expect(e.checks[0]).toMatchObject({
      status: "weak",
      quote: null,
      rejectedQuotes: ["Added to support the CE upgrade path."],
    });
  });
});
