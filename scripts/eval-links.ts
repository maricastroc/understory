import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { collect, parseLocation } from "@understory/core/collect";
import type { Artifact, Evidence } from "@understory/core/types";
import { parseControls, parseReplay } from "./eval-audit-claims";
import type { Case, Gold } from "./eval-check";
import {
  type Outcome,
  type Placement,
  type ReviewComment,
  type Signals,
  type SourceLink,
  blockAround,
  byStructureAlone,
  changedTerms,
  closest,
  commentsOf,
  elsewhereTerms,
  judgeThenStructure,
  linkOf,
  patchRows,
  placementOf,
  shared,
  structureAsProof,
  terms,
  whatItDid,
} from "./eval-link-signals";

const proc = process as NodeJS.Process & { loadEnvFile?: (path?: string) => void };
for (const file of [".env.local", ".env"]) if (existsSync(file)) proc.loadEnvFile?.(file);

type CommitInfo = { files: number; lines: number; patches: Record<string, string> };

type Row = {
  id: string;
  kind: string;
  expect: string;
  text: string;
  scope: { files: number; lines: number; block: number | null } | null;
  sources: Array<{
    id: string;
    kind: string;
    link: SourceLink;
    passage: string;
    namesLine: string[];
    namesBlock: string[];
    namesElsewhere: string[];
    comments: Placed[];
  }>;
  signals: Signals;
  judge: { supported: number; judged: number };
  outcomes: {
    structureAlone: Outcome;
    structureAsProof: Outcome;
    judgeThenStructure: Outcome[];
    judgeThenHints: Outcome[];
  };
};

async function commitInfo(repo: string, sha: string): Promise<CommitInfo> {
  if (repo.startsWith(".")) {
    const git = (...args: string[]) =>
      execFileSync("git", ["-C", repo, ...args], { encoding: "utf8" });
    const stat = git("show", "--numstat", "--format=", sha)
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((row) => row.split("\t"));
    const patches = Object.fromEntries(
      stat.map((row) => [row[2], git("show", "--format=", sha, "--", row[2])]),
    );
    const lines = stat.reduce((sum, row) => sum + Number(row[0] || 0) + Number(row[1] || 0), 0);
    return { files: stat.length, lines, patches };
  }
  const res = await fetch(`https://api.github.com/repos/${repo}/commits/${sha}`, {
    headers: {
      accept: "application/vnd.github+json",
      ...(process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`GitHub answered ${res.status} for ${repo}@${sha}`);
  const body = (await res.json()) as {
    stats?: { total?: number };
    files?: Array<{ filename: string; patch?: string }>;
  };
  const files = body.files ?? [];
  return {
    files: files.length,
    lines: body.stats?.total ?? 0,
    patches: Object.fromEntries(files.map((f) => [f.filename, f.patch ?? ""])),
  };
}

async function reviewComments(repo: string, number: number): Promise<ReviewComment[]> {
  const [owner, name] = repo.split("/");
  const query =
    "query($o:String!,$r:String!,$n:Int!){repository(owner:$o,name:$r){pullRequest(number:$n){reviews(first:50){nodes{comments(first:50){nodes{body path outdated diffHunk}}}}}}}";
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.GITHUB_TOKEN ?? ""}`,
    },
    body: JSON.stringify({ query, variables: { o: owner, r: name, n: number } }),
  });
  if (!res.ok)
    throw new Error(`GitHub answered ${res.status} for the reviews of ${repo}#${number}`);
  const body = (await res.json()) as {
    data?: {
      repository?: {
        pullRequest?: { reviews: { nodes: Array<{ comments: { nodes: ReviewComment[] } }> } };
      };
    };
  };
  return (body.data?.repository?.pullRequest?.reviews.nodes ?? []).flatMap((r) => r.comments.nodes);
}

type Placed = { placement: Placement; outdated: boolean; says: string };

const GROUPS: Array<[string, (kind: string, expect: string) => boolean]> = [
  ["should be credited", (_, expect) => expect === "supported"],
  [
    "a borrowed reason",
    (kind) => /another part of the (same )?change|another change in the line/.test(kind),
  ],
  ["another claim that should not be credited", () => true],
];
const groupOf = (kind: string, expect: string) => GROUPS.find(([, is]) => is(kind, expect))![0];

async function main() {
  const out = process.argv[2];
  const replayFile =
    process.argv[3] ?? "eval/results/2026-10-12-patch-context-replay-one-question.jsonl";
  if (!out) {
    console.error("usage: npm run eval:links -- <out.json> [kept replay.jsonl]");
    process.exit(1);
  }
  const gold: Gold = JSON.parse(readFileSync("eval/gold.json", "utf8"));
  const cases = new Map<string, Case>(gold.cases.map((c) => [c.id, c]));
  const controls = parseControls(readFileSync("eval/audit-controls.json", "utf8"));
  const replay = parseReplay(readFileSync(replayFile, "utf8"));
  const evidence = new Map<string, Evidence>();
  const commits = new Map<string, CommitInfo>();
  const reviews = new Map<string, ReviewComment[]>();
  const census: Array<{ id: string; pull: string; comments: Placed[] }> = [];
  const rows: Row[] = [];

  for (const control of controls) {
    const c = cases.get(control.id)!;
    const repo = c.repo ?? gold.repo;
    if (!evidence.has(c.id))
      evidence.set(
        c.id,
        await collect({
          repoPath: repo,
          question: c.question,
          location: parseLocation(c.location),
        }),
      );
    const ev = evidence.get(c.id)!;
    const byId = new Map<string, Artifact>(ev.artifacts.map((a) => [a.id, a]));
    const last = ev.artifacts
      .filter((a) => a.kind === "commit")
      .reduce<Artifact | null>((a, b) => (!a || b.date > a.date ? b : a), null);
    const sha = last?.meta?.sha;
    const file = ev.location?.file ?? "";
    const line =
      ev.code && ev.location
        ? (ev.code.lines[ev.location.startLine - ev.code.startLine] ?? "")
        : "";
    const change = ev.code?.change ?? null;
    if (typeof sha === "string" && !commits.has(`${repo}@${sha}`))
      commits.set(`${repo}@${sha}`, await commitInfo(repo, sha));
    const info = typeof sha === "string" ? commits.get(`${repo}@${sha}`)! : null;
    const patch = info?.patches[file] ?? "";
    const block = blockAround(patch, line);
    const everywhere = Object.values(info?.patches ?? {}).flatMap((p) => patchRows(p).removed);
    const did = change ? whatItDid(line, change.before, everywhere) : null;
    const blockRows = block ? patchRows(block.join("\n")) : null;
    const onLine = change ? changedTerms(change.before, line) : new Set<string>();
    const inBlock = blockRows
      ? changedTerms(blockRows.removed.join("\n") || null, blockRows.added.join("\n"))
      : new Set<string>();
    const blockTerms = terms((block ?? []).map((row) => row.slice(1)).join("\n"));
    const inside = new Set(block ?? []);
    const rest = terms(
      Object.entries(info?.patches ?? {})
        .flatMap(([name, text]) =>
          text
            .split("\n")
            .filter((row) => /^[+-]/.test(row) && !/^(\+\+\+|---)/.test(row))
            .filter((row) => name !== file || !inside.has(row))
            .map((row) => row.slice(1)),
        )
        .join("\n"),
    );
    const pulls = repo.startsWith(".") ? [] : ev.artifacts.filter((a) => a.kind === "pull_request");
    for (const pull of pulls) {
      const key = `${repo}#${pull.id}`;
      if (reviews.has(key)) continue;
      reviews.set(key, await reviewComments(repo, Number(pull.id.replace("pr:", ""))));
      census.push({
        id: c.id,
        pull: pull.id,
        comments: reviews.get(key)!.map((comment) => ({
          placement: placementOf(comment, file, line),
          outdated: comment.outdated,
          says: comment.body.replace(/\s+/g, " ").slice(0, 100),
        })),
      });
    }
    const placed = (a: Artifact): Placed[] =>
      a.kind !== "review"
        ? []
        : commentsOf(
            a,
            pulls.flatMap((pull) => reviews.get(`${repo}#${pull.id}`) ?? []),
          ).map((comment) => ({
            placement: placementOf(comment, file, line),
            outdated: comment.outdated,
            says: comment.body.replace(/\s+/g, " ").slice(0, 100),
          }));
    const cited = control.citations.map((id) => byId.get(id)).filter((a): a is Artifact => !!a);
    const sources = cited.map((a) => {
      const link = linkOf(a, last?.id ?? null, byId);
      const passage = closest(`${a.title}\n${a.body}`, control.text);
      const said = terms(passage);
      return {
        id: a.id,
        kind: a.kind,
        link,
        passage: passage.slice(0, 160),
        namesLine: link === "this change" ? shared(said, onLine) : [],
        namesBlock: link === "this change" ? shared(said, inBlock) : [],
        namesElsewhere: link === "this change" ? elsewhereTerms(said, blockTerms, rest) : [],
        comments: placed(a),
      };
    });
    const signals: Signals = {
      did,
      links: sources.map((s) => s.link),
      alone: !!info && !!block && info.files === 1 && info.lines === block.length,
      namesLine: sources.some((s) => s.namesLine.length > 0),
      namesBlock: sources.some((s) => s.namesBlock.length > 0),
      namesElsewhere: sources.some((s) => s.namesElsewhere.length > 0),
    };
    const judged = replay.judgements.filter((j) => j.kind && j.claim === control.text && j.status);
    const judge = {
      supported: judged.filter((j) => j.status === "supported").length,
      judged: judged.length,
    };
    rows.push({
      id: control.id,
      kind: control.kind,
      expect: control.expect,
      text: control.text,
      scope: info ? { files: info.files, lines: info.lines, block: block?.length ?? null } : null,
      sources,
      signals,
      judge,
      outcomes: {
        structureAlone: byStructureAlone(signals),
        structureAsProof: structureAsProof(signals),
        judgeThenStructure: judgeThenStructure(signals, judge),
        judgeThenHints: judgeThenStructure(signals, judge, true),
      },
    });
  }

  const facts = [];
  for (const c of gold.cases) {
    const repo = c.repo ?? gold.repo;
    if (!evidence.has(c.id))
      evidence.set(
        c.id,
        await collect({
          repoPath: repo,
          question: c.question,
          location: parseLocation(c.location),
        }),
      );
    const ev = evidence.get(c.id)!;
    const byId = new Map<string, Artifact>(ev.artifacts.map((a) => [a.id, a]));
    const last = ev.artifacts
      .filter((a) => a.kind === "commit")
      .reduce<Artifact | null>((a, b) => (!a || b.date > a.date ? b : a), null);
    const sha = last?.meta?.sha;
    const file = ev.location?.file ?? "";
    const line =
      ev.code && ev.location
        ? (ev.code.lines[ev.location.startLine - ev.code.startLine] ?? "")
        : "";
    if (typeof sha === "string" && !commits.has(`${repo}@${sha}`))
      commits.set(`${repo}@${sha}`, await commitInfo(repo, sha));
    const info = typeof sha === "string" ? commits.get(`${repo}@${sha}`)! : null;
    const block = blockAround(info?.patches[file] ?? "", line);
    const pulls = repo.startsWith(".") ? [] : ev.artifacts.filter((a) => a.kind === "pull_request");
    for (const pull of pulls)
      if (!reviews.has(`${repo}#${pull.id}`))
        reviews.set(
          `${repo}#${pull.id}`,
          await reviewComments(repo, Number(pull.id.replace("pr:", ""))),
        );
    const placedIn = pulls.flatMap((pull) => reviews.get(`${repo}#${pull.id}`) ?? []);
    facts.push({
      id: c.id,
      granularity: ev.coverage?.granularity ?? null,
      lastChange: last?.id ?? null,
      alone: !!info && !!block && info.files === 1 && info.lines === block.length,
      sources: Object.fromEntries(
        ev.artifacts.map((a) => [
          a.id,
          {
            kind: a.kind,
            link: linkOf(a, last?.id ?? null, byId),
            comments:
              a.kind === "review"
                ? commentsOf(a, placedIn).map((comment) => ({
                    placement: placementOf(comment, file, line),
                    outdated: comment.outdated,
                  }))
                : [],
          },
        ]),
      ),
    });
  }

  writeFileSync(
    out,
    `${JSON.stringify({ date: new Date().toISOString(), replay: replayFile, judge: replay.meta?.commit ?? null, controls: rows, reviewComments: census, cases: facts }, null, 2)}\n`,
  );

  console.log("review comments with a position, by where they sit against the investigated line:");
  for (const { id, pull, comments } of census) {
    const at = (placement: Placement) => comments.filter((c) => c.placement === placement).length;
    console.log(
      `  ${id} ${pull}: ${comments.length} comments · on the line ${at("on the line")} · in its hunk ${at("in its hunk")} · same file, elsewhere ${at("same file, elsewhere")} · another file ${at("another file")}`,
    );
  }
  console.log("controls that cite a review comment:");
  for (const r of rows)
    for (const source of r.sources.filter((x) => x.kind === "review"))
      console.log(
        `  ${r.id} [${r.expect}] ${source.id}: ${source.comments.map((c) => c.placement).join(", ") || "no placed comment"} · judge ${r.judge.supported} of ${r.judge.judged}`,
      );

  const count = (list: Outcome[]) =>
    `${list.filter((o) => o === "credit").length} credited · ${list.filter((o) => o === "reject").length} refused · ${list.filter((o) => o === "inconclusive").length} inconclusive`;
  for (const [group] of GROUPS) {
    const mine = rows.filter((r) => groupOf(r.kind, r.expect) === group);
    const having = (is: (r: Row) => boolean) => mine.filter(is).length;
    console.log(`\n${group}: ${mine.length} controls`);
    console.log(
      `  facts: every source of this change ${having((r) => r.signals.links.length > 0 && r.signals.links.every((l) => l === "this change"))} · some source of another change ${having((r) => r.signals.links.includes("another change"))} · the change moved or only re-spaced the line ${having((r) => r.signals.did === "moved" || r.signals.did === "respaced")}`,
    );
    console.log(
      `  hints: the change is this block alone ${having((r) => r.signals.alone)} · the passage names what changed on the line ${having((r) => r.signals.namesLine)} · it names something in the block only ${having((r) => r.signals.namesBlock && !r.signals.namesLine)} · it names only what the change did elsewhere ${having((r) => r.signals.namesElsewhere && !r.signals.namesLine && !r.signals.namesBlock)}`,
    );
    console.log(
      `  structure alone, refuting only: ${count(mine.map((r) => r.outcomes.structureAlone))}`,
    );
    console.log(
      `  structure taken as proof:       ${count(mine.map((r) => r.outcomes.structureAsProof))}`,
    );
    console.log(
      `  the kept judge alone:           ${mine.reduce((n, r) => n + r.judge.supported, 0)} credited of ${mine.reduce((n, r) => n + r.judge.judged, 0)} judgements`,
    );
    console.log(
      `  the kept judge, then structure: ${count(mine.flatMap((r) => r.outcomes.judgeThenStructure))}`,
    );
    console.log(
      `  the same, hints also refuting:  ${count(mine.flatMap((r) => r.outcomes.judgeThenHints))}`,
    );
  }
}

void main();
